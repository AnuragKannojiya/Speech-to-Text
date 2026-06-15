export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export class TranscriptionService {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private onTranscriptCallback: (event: TranscriptEvent) => void;
  private onErrorCallback: (error: Error) => void;
  private onStatusChangeCallback: (status: ConnectionState) => void;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionallyClosed = false;

  constructor(
    apiKey: string,
    onTranscript: (event: TranscriptEvent) => void,
    onError: (error: Error) => void,
    onStatusChange: (status: ConnectionState) => void
  ) {
    this.apiKey = apiKey;
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    this.onStatusChangeCallback = onStatusChange;
  }

  /**
   * Connect to Deepgram's live transcription WebSocket endpoint
   */
  public connect() {
    // If there's an existing socket, clean it up
    if (this.socket) {
      this.disconnect();
    }

    if (!this.apiKey) {
      this.onErrorCallback(
        new Error('Deepgram API Key is missing. Live transcription is unavailable.')
      );
      this.setConnectionState('disconnected');
      return;
    }

    this.isIntentionallyClosed = false;
    this.setConnectionState('connecting');

    try {
      // Configure Deepgram live audio params:
      // model: nova-2 (best balance of speed and accuracy)
      // interim_results: true (needed for real-time responsiveness)
      // Deepgram will auto-detect container headers (webm/opus)
      const url =
        'wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true';

      // Authenticate securely in the browser using the Sec-WebSocket-Protocol subprotocol
      this.socket = new WebSocket(url, ['token', this.apiKey]);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        console.log('Deepgram WebSocket connection established successfully.');
      };

      this.socket.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data);
          
          // Deepgram responds with transcript alternatives
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;
          
          if (transcript !== undefined) {
            this.onTranscriptCallback({
              text: transcript,
              isFinal: !!isFinal,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error('Failed to parse Deepgram message:', err);
        }
      };

      this.socket.onerror = (errorEvent) => {
        console.error('Deepgram WebSocket error occurred:', errorEvent);
        // Do not trigger reconnection directly here, let onclose handle it to avoid duplicate triggers
        this.onErrorCallback(
          new Error('Deepgram WebSocket connection encountered an error.')
        );
      };

      this.socket.onclose = (closeEvent) => {
        this.socket = null;
        console.log(
          `Deepgram WebSocket connection closed. Code: ${closeEvent.code}, Reason: ${closeEvent.reason}`
        );

        if (this.isIntentionallyClosed) {
          this.setConnectionState('disconnected');
        } else {
          // If connection was unexpectedly dropped (internet loss, server-side drop)
          this.setConnectionState('disconnected');
          this.handleReconnect();
        }
      };
    } catch (err) {
      this.setConnectionState('disconnected');
      this.onErrorCallback(
        err instanceof Error ? err : new Error('Failed to initialize WebSocket connection')
      );
    }
  }

  /**
   * Streams raw audio chunks directly over the WebSocket
   */
  public sendAudio(blob: Blob) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(blob);
    } else {
      console.warn('Cannot send audio: WebSocket connection is not open.');
    }
  }

  /**
   * Manually disconnects and cleans up resources
   */
  public disconnect() {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      // Only close if it's open or connecting
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Attempts reconnection with exponential backoff
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onErrorCallback(
        new Error('Reconnection to Deepgram failed. Max retry attempts reached. Please check your internet.')
      );
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('connecting');

    // Exponential delay logic: 1s, 2s, 4s, 8s, maxing out at 10s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(
      `Attempting to reconnect to Deepgram in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.onStatusChangeCallback(state);
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

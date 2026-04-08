import "@testing-library/jest-dom";

// Mock EventSource for SSE tests
class MockEventSource {
  url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onopen: ((ev: Event) => void) | null = null;
  readyState: number = 0;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event("open"));
    }, 0);
  }

  close() {
    this.readyState = 2;
  }

  // Test helper: simulate a message
  simulateMessage(data: object) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(data) })
    );
  }

  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
  dispatchEvent(_event: Event): boolean { return true; }
}

Object.defineProperty(global, "EventSource", {
  writable: true,
  value: MockEventSource,
});

beforeEach(() => {
  MockEventSource.instances = [];
});

/** Jest mock for lightweight-charts. Canvas APIs aren't available in jsdom,
 *  so we substitute lightweight stubs that record interactions for assertions. */

export type UTCTimestamp = number;

export interface MockSeriesPoint {
  time: number;
  value: number;
}

export class MockSeries {
  data: MockSeriesPoint[] = [];
  options: Record<string, unknown>;
  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
  }
  setData(data: MockSeriesPoint[]) {
    this.data = [...data];
  }
  update(point: MockSeriesPoint) {
    this.data.push(point);
  }
  applyOptions(options: Record<string, unknown>) {
    this.options = { ...this.options, ...options };
  }
}

export class MockChart {
  container: HTMLElement;
  options: Record<string, unknown>;
  series: MockSeries[] = [];
  removed = false;
  constructor(container: HTMLElement, options: Record<string, unknown> = {}) {
    this.container = container;
    this.options = options;
    MockChart.instances.push(this);
  }
  static instances: MockChart[] = [];
  addSeries(_definition: unknown, options: Record<string, unknown> = {}) {
    const series = new MockSeries(options);
    this.series.push(series);
    return series;
  }
  remove() {
    this.removed = true;
  }
  applyOptions(options: Record<string, unknown>) {
    this.options = { ...this.options, ...options };
  }
  resize() {}
  timeScale() {
    return { fitContent: () => {}, scrollToRealTime: () => {} };
  }
}

export const LineSeries = "LineSeries";
export const AreaSeries = "AreaSeries";

export function createChart(
  container: HTMLElement,
  options: Record<string, unknown> = {}
) {
  return new MockChart(container, options);
}

export function __resetMockCharts() {
  MockChart.instances = [];
}

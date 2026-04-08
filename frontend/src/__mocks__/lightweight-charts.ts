/** Mock for lightweight-charts v5 (canvas library) in Jest/jsdom. */

const mockSeries = {
  setData: jest.fn(),
  update: jest.fn(),
};

export const createChart = jest.fn(() => ({
  // v5 API
  addSeries: jest.fn(() => mockSeries),
  applyOptions: jest.fn(),
  timeScale: jest.fn(() => ({ fitContent: jest.fn() })),
  remove: jest.fn(),
  resize: jest.fn(),
}));

export const ColorType = { Solid: "solid" };
export const LineStyle = { Solid: 0 };
// v5 series type tokens
export const LineSeries = "LineSeries";
export const AreaSeries = "AreaSeries";
export const BarSeries = "BarSeries";

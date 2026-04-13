import type { ThemeConfig } from "antd";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0095F6",
    colorError: "#ED4956",
    colorSuccess: "#00C851",
    colorWarning: "#FF6B35",
    colorText: "#262626",
    colorTextSecondary: "#737373",
    colorBorder: "#DBDBDB",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#FAFAFA",
    fontFamily: "'Instrument Sans', 'Noto Sans KR', system-ui, sans-serif",
    borderRadius: 4,
    fontSize: 14,
  },
  components: {
    Button: {
      controlHeight: 44,
      fontWeight: 700,
    },
    Input: {
      controlHeight: 42,
    },
  },
};

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import App from "./app/App";
import "./styles/global.css";
const query = new QueryClient();
const theme = createTheme({
  palette: {
    primary: { main: "#1c3d31" },
    secondary: { main: "#d5f58a" },
    background: { default: "#f7f8f2", paper: "#ffffff" },
    text: { primary: "#18372c", secondary: "#65736a" },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.9rem" },
    h4: {
      fontSize: "2.4rem",
      fontWeight: 650,
      letterSpacing: "-0.055em",
      lineHeight: 1.15,
    },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          padding: "13px 23px",
          borderRadius: 50,
          transition: "background .2s, transform .2s",
          "&:hover": { transform: "translateY(-2px)" },
        },
        outlined: { borderColor: "#cad2c7" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          background: "#fbfcf9",
          "& fieldset": { borderColor: "#dbe1d7" },
          "&.Mui-focused fieldset": { borderWidth: 1 },
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={query}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

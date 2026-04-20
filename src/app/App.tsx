import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppToaster } from "./components/AppToaster";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <AppToaster />
    </>
  );
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEditorDrafts, useEditorDraft } from "./useEditorDraft";
const initial = {
  dirty: false as boolean,
  tab: 0,
  draft: { title: "", topics: [] as string[] },
};
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false } },
  });
  client.setQueryData(["session"], {
    id: "admin-1",
    roles: ["Admin"],
    fullName: "Admin",
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(clearEditorDrafts);
afterEach(() => {
  vi.restoreAllMocks();
  clearEditorDrafts();
});
describe("Borradores del editor", () => {
  it("conserva estructura y pestaña al desmontar y volver", () => {
    const first = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    act(() =>
      first.result.current.setState({
        dirty: true,
        tab: 1,
        draft: { title: "Ventas", topics: ["Tema 1", "Tema 2"] },
      }),
    );
    first.unmount();
    const next = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    expect(next.result.current.state).toEqual({
      dirty: true,
      tab: 1,
      draft: { title: "Ventas", topics: ["Tema 1", "Tema 2"] },
    });
  });
  it("prefiere el servidor para borradores ya guardados sin perder el paso", () => {
    const first = renderHook(() => useEditorDraft("course:saved", initial), {
      wrapper,
    });
    act(() => first.result.current.setState({ ...initial, tab: 2 }));
    first.unmount();
    const next = renderHook(
      () =>
        useEditorDraft("course:saved", {
          ...initial,
          draft: { title: "Última versión", topics: [] },
        }),
      { wrapper },
    );
    expect(next.result.current.state.draft.title).toBe("Última versión");
    expect(next.result.current.state.tab).toBe(2);
  });
  it("borra la copia al cerrar sesión", () => {
    const first = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    act(() =>
      first.result.current.setState({
        ...initial,
        dirty: true,
        draft: { title: "Privado", topics: [] },
      }),
    );
    first.unmount();
    clearEditorDrafts();
    const next = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    expect(next.result.current.state).toEqual(initial);
  });
  it("mantiene memoria y avisa si el navegador rechaza la persistencia", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const first = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    act(() =>
      first.result.current.setState({
        ...initial,
        dirty: true,
        draft: { title: "Conservado", topics: [] },
      }),
    );
    expect(first.result.current.persistent).toBe(false);
    first.unmount();
    const next = renderHook(() => useEditorDraft("course:new", initial), {
      wrapper,
    });
    expect(next.result.current.state.draft.title).toBe("Conservado");
  });
});

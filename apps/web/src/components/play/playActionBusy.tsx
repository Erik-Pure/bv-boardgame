import { createContext, useContext } from "react";

const PlayActionBusyContext = createContext(false);

export function PlayActionBusyProvider(props: { busy: boolean; children: React.ReactNode }) {
  return (
    <PlayActionBusyContext.Provider value={props.busy}>{props.children}</PlayActionBusyContext.Provider>
  );
}

export function usePlayActionBusy(): boolean {
  return useContext(PlayActionBusyContext);
}

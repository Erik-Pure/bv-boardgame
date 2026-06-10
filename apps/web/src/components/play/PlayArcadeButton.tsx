import type { ComponentProps } from "react";
import { ArcadeButton } from "../ArcadeButton";
import { usePlayActionBusy } from "./playActionBusy";

export function PlayArcadeButton(props: ComponentProps<typeof ArcadeButton>) {
  const busy = usePlayActionBusy();
  return <ArcadeButton {...props} disabled={busy || props.disabled} />;
}

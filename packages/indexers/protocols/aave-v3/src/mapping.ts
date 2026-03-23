import { log } from "@graphprotocol/graph-ts";

import { Supply as SupplyEvent } from "../generated/Pool/Pool";

export function handleDeposit(event: SupplyEvent): void {
  log.info("handleDeposit (stub) tx={}", [
    event.transaction.hash.toHexString(),
  ]);
}

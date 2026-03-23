import { BigInt, Address } from "@graphprotocol/graph-ts";

import {
  Supply as SupplyEvent,
  Withdraw as WithdrawEvent,
  Borrow as BorrowEvent,
  Repay as RepayEvent,
} from "../generated/Pool/Pool";
import {
  User,
  Deposit,
  Withdrawal,
  Borrow as BorrowEntity,
  Repayment,
} from "../generated/schema";

function loadOrCreateUser(addr: Address): User {
  let id = addr.toHexString();
  let user = User.load(id);
  if (user == null) {
    user = new User(id);
    user.address = addr;
    user.save();
  }
  return user as User;
}

function makeEntityId(txHashHex: string, logIndex: BigInt): string {
  return txHashHex.concat("-").concat(logIndex.toString());
}

/** Placeholder: graph-ts no expone gas usado en el mapping; el agregado en Python puede usar 0 o ampliar el subgrafo. */
function stubGas(): BigInt {
  return BigInt.fromI32(0);
}

export function handleSupply(event: SupplyEvent): void {
  let user = loadOrCreateUser(event.params.user);
  let id = makeEntityId(event.transaction.hash.toHexString(), event.logIndex);
  let d = new Deposit(id);
  d.user = user.id;
  d.reserve = event.params.reserve;
  d.amount = event.params.amount;
  d.blockNumber = event.block.number;
  d.txHash = event.transaction.hash;
  d.logIndex = event.logIndex;
  d.gasUsed = stubGas();
  d.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let user = loadOrCreateUser(event.params.user);
  let id = makeEntityId(event.transaction.hash.toHexString(), event.logIndex);
  let w = new Withdrawal(id);
  w.user = user.id;
  w.reserve = event.params.reserve;
  w.to = event.params.to;
  w.amount = event.params.amount;
  w.blockNumber = event.block.number;
  w.txHash = event.transaction.hash;
  w.logIndex = event.logIndex;
  w.gasUsed = stubGas();
  w.save();
}

export function handleBorrow(event: BorrowEvent): void {
  let user = loadOrCreateUser(event.params.user);
  let id = makeEntityId(event.transaction.hash.toHexString(), event.logIndex);
  let b = new BorrowEntity(id);
  b.user = user.id;
  b.reserve = event.params.reserve;
  b.amount = event.params.amount;
  b.interestRateMode = event.params.interestRateMode;
  b.blockNumber = event.block.number;
  b.txHash = event.transaction.hash;
  b.logIndex = event.logIndex;
  b.gasUsed = stubGas();
  b.save();
}

export function handleRepay(event: RepayEvent): void {
  let user = loadOrCreateUser(event.params.user);
  let id = makeEntityId(event.transaction.hash.toHexString(), event.logIndex);
  let r = new Repayment(id);
  r.user = user.id;
  r.reserve = event.params.reserve;
  r.repayer = event.params.repayer;
  r.amount = event.params.amount;
  r.blockNumber = event.block.number;
  r.txHash = event.transaction.hash;
  r.logIndex = event.logIndex;
  r.gasUsed = stubGas();
  r.save();
}

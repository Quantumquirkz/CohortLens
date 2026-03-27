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

function bigIntOrZero(v: BigInt | null): BigInt {
  if (v === null) {
    return BigInt.fromI32(0);
  }
  return v;
}

/** graph-ts no expone gas usado de forma portable en todos los runtimes; seguir en 0 o ampliar con receipt cuando el host lo soporte. */
function stubGas(): BigInt {
  return BigInt.fromI32(0);
}

function touchUserBlocks(user: User, blockNumber: BigInt): void {
  let fb = user.firstActivityBlock;
  if (fb === null) {
    user.firstActivityBlock = blockNumber;
  } else if (blockNumber.lt(fb)) {
    user.firstActivityBlock = blockNumber;
  }
  let lb = user.lastActivityBlock;
  if (lb === null) {
    user.lastActivityBlock = blockNumber;
  } else if (blockNumber.gt(lb)) {
    user.lastActivityBlock = blockNumber;
  }
}

function initUserAggregates(user: User): void {
  if (user.depositCount === null) user.depositCount = BigInt.fromI32(0);
  if (user.withdrawCount === null) user.withdrawCount = BigInt.fromI32(0);
  if (user.borrowCount === null) user.borrowCount = BigInt.fromI32(0);
  if (user.repayCount === null) user.repayCount = BigInt.fromI32(0);
  if (user.totalDepositVolume === null)
    user.totalDepositVolume = BigInt.fromI32(0);
  if (user.totalWithdrawVolume === null)
    user.totalWithdrawVolume = BigInt.fromI32(0);
  if (user.totalBorrowVolume === null)
    user.totalBorrowVolume = BigInt.fromI32(0);
  if (user.totalRepayVolume === null) user.totalRepayVolume = BigInt.fromI32(0);
}

function loadOrCreateUser(addr: Address): User {
  let id = addr.toHexString();
  let user = User.load(id);
  if (user === null) {
    user = new User(id);
    user.address = addr;
    user.firstActivityBlock = null;
    user.lastActivityBlock = null;
    initUserAggregates(user);
    user.save();
  } else {
    initUserAggregates(user);
  }
  return user;
}

function makeEntityId(txHashHex: string, logIndex: BigInt): string {
  return txHashHex.concat("-").concat(logIndex.toString());
}

export function handleSupply(event: SupplyEvent): void {
  let user = loadOrCreateUser(event.params.user);
  touchUserBlocks(user, event.block.number);
  user.depositCount = bigIntOrZero(user.depositCount).plus(BigInt.fromI32(1));
  user.totalDepositVolume = bigIntOrZero(user.totalDepositVolume).plus(
    event.params.amount,
  );
  user.save();

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
  touchUserBlocks(user, event.block.number);
  user.withdrawCount = bigIntOrZero(user.withdrawCount).plus(BigInt.fromI32(1));
  user.totalWithdrawVolume = bigIntOrZero(user.totalWithdrawVolume).plus(
    event.params.amount,
  );
  user.save();

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
  touchUserBlocks(user, event.block.number);
  user.borrowCount = bigIntOrZero(user.borrowCount).plus(BigInt.fromI32(1));
  user.totalBorrowVolume = bigIntOrZero(user.totalBorrowVolume).plus(
    event.params.amount,
  );
  user.save();

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
  touchUserBlocks(user, event.block.number);
  user.repayCount = bigIntOrZero(user.repayCount).plus(BigInt.fromI32(1));
  user.totalRepayVolume = bigIntOrZero(user.totalRepayVolume).plus(
    event.params.amount,
  );
  user.save();

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

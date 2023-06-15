import { BigInt, log, Address, store } from "@graphprotocol/graph-ts";
import { MinterFilter, Minter } from "../generated/schema";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  ProjectMaxInvocationsLimitUpdated
} from "../generated/ISharedMinterV0/ISharedMinterV0";

import {
  loadOrCreateSharedMinterFilter,
  loadOrCreateMinter,
  loadOrCreateCoreRegistry,
  generateMinterFilterContractAllowlistId,
  generateContractSpecificId,
  loadOrCreateAndSetProjectMinterConfiguration
} from "./helpers";

// TODO - write handlers

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as authorizedFunctions from "../authorizedFunctions.js";
import type * as collections from "../collections.js";
import type * as devices from "../devices.js";
import type * as driveActions from "../driveActions.js";
import type * as driveClient from "../driveClient.js";
import type * as driveCrypto from "../driveCrypto.js";
import type * as driveInternals from "../driveInternals.js";
import type * as http from "../http.js";
import type * as libraries from "../libraries.js";
import type * as media from "../media.js";
import type * as migrations from "../migrations.js";
import type * as playlists from "../playlists.js";
import type * as shared from "../shared.js";
import type * as storage from "../storage.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  activity: typeof activity;
  auth: typeof auth;
  authorizedFunctions: typeof authorizedFunctions;
  collections: typeof collections;
  devices: typeof devices;
  driveActions: typeof driveActions;
  driveClient: typeof driveClient;
  driveCrypto: typeof driveCrypto;
  driveInternals: typeof driveInternals;
  http: typeof http;
  libraries: typeof libraries;
  media: typeof media;
  migrations: typeof migrations;
  playlists: typeof playlists;
  shared: typeof shared;
  storage: typeof storage;
  viewer: typeof viewer;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

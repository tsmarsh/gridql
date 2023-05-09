"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callSubgraph = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const callSubgraph = (url, query, queryName) => __awaiter(void 0, void 0, void 0, function* () {
    const body = JSON.stringify({ "query": query });
    console.log(`Sending: ${body} to ${url}`);
    const response = yield (0, node_fetch_1.default)(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body
    });
    const json = yield response.json();
    if (json.hasOwnProperty('errors')) {
        console.log(json);
    }
    return json["data"][queryName];
});
exports.callSubgraph = callSubgraph;

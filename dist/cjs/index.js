"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.setCacheSize = exports.validate = exports.searchJsonPaged = exports.searchJson = exports.initEngine = exports.SearchEngine = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./lexer.js"), exports);
__exportStar(require("./parser.js"), exports);
__exportStar(require("./engine.js"), exports);
__exportStar(require("./utils.js"), exports);
__exportStar(require("./indexes.js"), exports);
__exportStar(require("./cache.js"), exports);
__exportStar(require("./aggregates.js"), exports);
var engine_class_js_1 = require("./engine-class.js");
Object.defineProperty(exports, "SearchEngine", { enumerable: true, get: function () { return engine_class_js_1.SearchEngine; } });
Object.defineProperty(exports, "initEngine", { enumerable: true, get: function () { return engine_class_js_1.initEngine; } });
Object.defineProperty(exports, "searchJson", { enumerable: true, get: function () { return engine_class_js_1.searchJson; } });
Object.defineProperty(exports, "searchJsonPaged", { enumerable: true, get: function () { return engine_class_js_1.searchJsonPaged; } });
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return engine_class_js_1.validate; } });
Object.defineProperty(exports, "setCacheSize", { enumerable: true, get: function () { return engine_class_js_1.setCacheSize; } });
exports.VERSION = "1.0.0";
//# sourceMappingURL=index.js.map
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "svg-arc-to-cubic-bezier"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("svg-arc-to-cubic-bezier"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.svgArcToCubicBezier);
    global.UtilsSVG = mod.exports;
  }
})(this, function (_exports, _svgArcToCubicBezier) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.UtilsSVG = void 0;
  _svgArcToCubicBezier = _interopRequireDefault(_svgArcToCubicBezier);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var UtilsSVG =
  /*#__PURE__*/
  function () {
    function UtilsSVG() {
      _classCallCheck(this, UtilsSVG);
    }

    _createClass(UtilsSVG, null, [{
      key: "parse",
      value: function parse(pathString) {
        return UtilsSVG.resolveRepeateCommand(pathString.match(/([astvzqmhlc])([^astvzqmhlc]*)/ig).map(function (command) {
          return [command.slice(0, 1), command.match(/-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig)];
        }).map(function (command) {
          return [command[0]].concat(command[1] !== null ? command[1].map(function (x) {
            return parseFloat(x);
          }) : []);
        }));
      }
    }, {
      key: "resolveRepeateCommand",
      value: function resolveRepeateCommand(commands) {
        var lens = {
          a: 7,
          c: 6,
          h: 1,
          l: 2,
          m: 2,
          q: 4,
          s: 4,
          t: 2,
          v: 1,
          z: 0
        };
        var result = [];
        commands.forEach(function (command) {
          var cmd = command[0].toLowerCase();
          var len = lens[cmd];
          if (len === 0) return result.push(command);
          var args = command.splice(1);

          if (args.length % len !== 0) {
            throw new Error('SVG path command argument number mismatch');
          }

          var setCount = args.length / len;

          for (var i = 0; i < setCount; i++) {
            var subArgs = args.slice(i * len, i * len + len);
            result.push([command[0]].concat(subArgs));
          }
        });
        return result;
      }
    }, {
      key: "toString",
      value: function toString(commands) {
        return commands.map(function (cmd) {
          return cmd.join(' ');
        }).join(' ');
      }
    }, {
      key: "pathBounds",
      value: function pathBounds(absoluteCommands) {
        var points = [];
        var x,
            y = 0;
        absoluteCommands.forEach(function (cmd) {
          switch (cmd[0]) {
            case 'H':
              x = cmd[1];
              points.push([x, y]);
              break;

            case 'V':
              y = cmd[1];
              points.push([x, y]);
              break;

            case 'A':
              x = cmd[6];
              y = cmd[7];
              points.push([x, y]);
              break;

            case 'C':
              points.push([cmd[1], cmd[2]]);
              points.push([cmd[3], cmd[4]]);
              x = cmd[5];
              y = cmd[6];
              points.push([x, y]);
              break;

            case 'S':
            case 'Q':
              x = cmd[3];
              y = cmd[4];
              points.push([x, y]);
              break;

            case 'T':
              x = cmd[1];
              y = cmd[2];
              points.push([x, y]);
              break;

            default:
              for (var j = 1; j < cmd.length; j += 2) {
                x = cmd[j];
                y = cmd[j + 1];
                points.push([x, y]);
              }

          }
        });
        var minX = Number.POSITIVE_INFINITY;
        var minY = Number.POSITIVE_INFINITY;
        var maxX = Number.NEGATIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;
        points.forEach(function (pt) {
          if (minX > pt[0]) minX = pt[0];
          if (minY > pt[1]) minY = pt[1];
          if (maxX < pt[0]) maxX = pt[0];
          if (maxY < pt[1]) maxY = pt[1];
        });
        return [minX, minY, maxX - minX, maxY - minY, points];
      } //abs-svg-path

    }, {
      key: "abs",
      value: function abs(commands) {
        var startX,
            startY,
            x,
            y = 0;
        return commands.map(function (seg) {
          seg = seg.slice();
          var type = seg[0];
          var command = type.toUpperCase(); // is relative

          if (type !== command) {
            seg[0] = command;

            switch (type) {
              case 'a':
                seg[6] += x;
                seg[7] += y;
                break;

              case 'v':
                seg[1] += y;
                break;

              case 'h':
                seg[1] += x;
                break;

              default:
                for (var i = 1; i < seg.length;) {
                  seg[i++] += x;
                  seg[i++] += y;
                }

            }
          } // update cursor state


          switch (command) {
            case 'A':
              x = seg[6];
              y = seg[7];
              break;

            case 'Z':
              x = startX;
              y = startY;
              break;

            case 'H':
              x = seg[1];
              break;

            case 'V':
              y = seg[1];
              break;

            case 'M':
              x = startX = seg[1];
              y = startY = seg[2];
              break;

            default:
              x = seg[seg.length - 2];
              y = seg[seg.length - 1];
          }

          return seg;
        });
      }
    }, {
      key: "drawGraphics",
      value: function drawGraphics(graphics, pathString) {
        var scale = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        var commands = UtilsSVG.abs(UtilsSVG.parse(pathString));

        if (scale !== 1) {
          commands = commands.map(function (cmd) {
            return cmd.map(function (arg, i) {
              return i === 0 ? arg : arg * scale;
            });
          });
        }

        var bounds = UtilsSVG.pathBounds(commands);
        var x,
            y = 0;
        commands.forEach(function (cmd) {
          switch (cmd[0]) {
            case 'A':
              console.log("\nrx ".concat(cmd[1], " \nry ").concat(cmd[2], "\nx-axis-rotation ").concat(cmd[3] / scale, "\nlarge-arc-flag ").concat(cmd[4] / scale, "\nsweep-flag ").concat(cmd[5] / scale, "\nx ").concat(cmd[6], "\ny ").concat(cmd[7], "\n"));
              var b = (0, _svgArcToCubicBezier.default)({
                px: x,
                py: y,
                cx: cmd[6],
                cy: cmd[7],
                rx: cmd[1],
                ry: cmd[2],
                xAxisRotation: cmd[3] / scale,
                largeArcFlag: cmd[4] / scale,
                sweepFlag: cmd[5] / scale
              })[0];
              console.log(b.x);
              graphics.bt(b.x1, b.y1, b.x2, b.y2, b.x, b.y);
              x = cmd[6];
              y = cmd[7];
              break;

            case 'C':
              graphics.bt(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
              x = cmd[5];
              y = cmd[6];
              break;

            case 'H':
              graphics.lt(cmd[1], y);
              x = cmd[1];
              break;

            case 'L':
              graphics.lt(cmd[1], cmd[2]);
              x = cmd[1];
              y = cmd[2];
              break;

            case 'M':
              graphics.mt(cmd[1], cmd[2]);
              x = cmd[1];
              y = cmd[2];
              break;

            case 'Q':
              graphics.qt(cmd[1], cmd[2], cmd[3], cmd[4]);
              x = cmd[3];
              y = cmd[4];
              break;

            case 'S':
              console.log('SVG Path T to graphics not implemented');
              break;

            case 'T':
              console.log('SVG Path T to graphics not implemented');
              break;

            case 'V':
              graphics.lt(x, cmd[1]);
              y = cmd[1];
              break;

            case 'Z':
              graphics.cp();
          }
        });
        return {
          graphics: graphics,
          bounds: bounds
        };
      }
    }]);

    return UtilsSVG;
  }();

  _exports.UtilsSVG = UtilsSVG;
});

//# sourceMappingURL=UtilsSVG.js.map
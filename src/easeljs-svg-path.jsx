/**
Copyright (c) 2018 Colin Leung

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**/

/* easeljs-svg-path use function a2c , a2c is part of svgpath
https://github.com/fontello/svgpath
* */
/**
 (The MIT License)

 Copyright (C) 2013-2015 by Vitaly Puzrin

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

**/

export default{
  resolveRepeateCommand(commands){
    const lens = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0};
    const result = [];

    commands.forEach(command => {
      const cmd = command[0].toLowerCase();
      const len = lens[cmd];
      if(len === 0)return result.push(command);

      const args = command.splice(1);

      if(args.length % len !== 0 ){
        throw new Error('SVG path command argument number mismatch');
      }

      const setCount = args.length / len;

      for(let i = 0; i < setCount; i++){
        const subArgs = args.slice(i * len, i * len + len);
        result.push([command[0]].concat(subArgs));
      }
    });

    return result;
  },

  parse(pathString){
    return this.resolveRepeateCommand(
      pathString
      .match(/([astvzqmhlc])([^astvzqmhlc]*)/ig)
      .map(command => [command.slice(0,1), command.match(/-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig)])
      .map(command => [command[0]].concat((command[1] !== null) ? command[1].map(x => parseFloat(x)): []))
    );
  },

  toString(commands){
    return commands
      .map(cmd => cmd.join(' '))
      .join(' ');
  },

  pathBounds(absoluteCommands) {
    let points = [];
    let x, y = 0;

    absoluteCommands.forEach(cmd => {
      switch(cmd[0]){
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
          for(let j = 1; j < cmd.length ; j += 2){
            x = cmd[j];
            y = cmd[j+1];
            points.push([x, y]);
          }
      }
    });

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    points.forEach(pt => {
      if(minX > pt[0])minX = pt[0];
      if(minY > pt[1])minY = pt[1];
      if(maxX < pt[0])maxX = pt[0];
      if(maxY < pt[1])maxY = pt[1];
    });

    return [minX, minY, maxX - minX, maxY - minY, points];
  },

//abs-svg-path
//    const lens = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0};
  abs(commands){
    let startX, startY, x, y = 0;

    return commands.map(seg => {
      seg = seg.slice();
      const type = seg[0];
      const command = type.toUpperCase();

      // is relative
      if (type !== command) {
        seg[0] = command;
        switch (type) {
          case 'a':
            seg[6] += x;
            seg[7] += y;
            break;
          case 'h':
              seg[1] += x;
              break;
          case 'v':
            seg[1] += y;
            break;
          default:
            for (let i = 1; i < seg.length;) {
              seg[i++] += x;
              seg[i++] += y;
            }
        }
      }

      // update cursor state
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

      return seg
    })
  },

  drawGraphics(graphics, pathString, scale=1){
    let commands = this.abs(this.parse(pathString));
    if(scale !== 1){
      commands = commands.map(cmd => cmd.map((arg, i) => {
        if(i === 0) return arg;
        //do not scale flags and angle in Arc
        if(/a/i.test(cmd[0]) && (i === 3 || i === 4 || i === 5)) return arg;

        return arg * scale;
      }));
    }

    let bounds = this.pathBounds(commands);

    let x, y, cx, cy = 0;
    commands.forEach(cmd => {
      switch(cmd[0]){
        case 'A':

          const b = a2c(x, y, cmd[6], cmd[7], cmd[4], cmd[5],cmd[1], cmd[2], cmd[3]);
          b.forEach(x =>{
            graphics.bt(x[2],x[3],x[4],x[5],x[6],x[7])
          });

          x = cmd[6];
          y = cmd[7];

          break;
        case 'C':
          graphics.bt(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
          x = cmd[5];
          y = cmd[6];
          cx = cmd[3];
          cy = cmd[4];
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
          cx = cmd[1];
          cy = cmd[2];
          break;
        case 'S':
          cx = x + (x - cx);
          cy = y + (y - cy);

          graphics.bt(cx, cy, cmd[1], cmd[2], cmd[3], cmd[4]);
          x = cmd[3];
          y = cmd[4];
          cx = cmd[1];
          cy = cmd[2];
          break;
        case 'T':
          cx = x + (x - cx);
          cy = y + (y - cy);

          graphics.qt(cx, cy, cmd[1], cmd[2]);
          x = cmd[1];
          y = cmd[2];

          break;
        case 'V':
          graphics.lt(x, cmd[1]);
          y = cmd[1];
          break;
        case 'Z':
          graphics.cp();
      }
    });

    return {graphics: graphics, bounds: bounds};
  }
}


/* code from Project SVGPATH */

// Convert an arc to a sequence of cubic bézier curves
//
const TAU = Math.PI * 2;

/* eslint-disable space-infix-ops */

// Calculate an angle between two unit vectors
//
// Since we measure angle between radii of circular arcs,
// we can use simplified math (without length normalization)
//
function unit_vector_angle(ux, uy, vx, vy) {
    const sign = (ux * vy - uy * vx < 0) ? -1 : 1;
    let dot  = ux * vx + uy * vy;

    // Add this to work with arbitrary vectors:
    // dot /= Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);

    // rounding errors, e.g. -1.0000000000000002 can screw up this
    if (dot >  1.0) { dot =  1.0; }
    if (dot < -1.0) { dot = -1.0; }

    return sign * Math.acos(dot);
}


// Convert from endpoint to center parameterization,
// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
//
// Return [cx, cy, theta1, delta_theta]
//
function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
    // Step 1.
    //
    // Moving an ellipse so origin will be the middlepoint between our two
    // points. After that, rotate it to line up ellipse axes with coordinate
    // axes.
    //
    const x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
    const y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

    const rx_sq  =  rx * rx;
    const ry_sq  =  ry * ry;
    const x1p_sq = x1p * x1p;
    const y1p_sq = y1p * y1p;

    // Step 2.
    //
    // Compute coordinates of the centre of this ellipse (cx', cy')
    // in the new coordinate system.
    //
    let radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

    if (radicant < 0) {
        // due to rounding errors it might be e.g. -1.3877787807814457e-17
        radicant = 0;
    }

    radicant /=   (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
    radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

    const cxp = radicant *  rx/ry * y1p;
    const cyp = radicant * -ry/rx * x1p;

    // Step 3.
    //
    // Transform back to get centre coordinates (cx, cy) in the original
    // coordinate system.
    //
    const cx = cos_phi*cxp - sin_phi*cyp + (x1+x2)/2;
    const cy = sin_phi*cxp + cos_phi*cyp + (y1+y2)/2;

    // Step 4.
    //
    // Compute angles (theta1, delta_theta).
    //
    const v1x =  (x1p - cxp) / rx;
    const v1y =  (y1p - cyp) / ry;
    const v2x = (-x1p - cxp) / rx;
    const v2y = (-y1p - cyp) / ry;

    const theta1 = unit_vector_angle(1, 0, v1x, v1y);
    let delta_theta = unit_vector_angle(v1x, v1y, v2x, v2y);

    if (fs === 0 && delta_theta > 0) {
        delta_theta -= TAU;
    }
    if (fs === 1 && delta_theta < 0) {
        delta_theta += TAU;
    }

    return [ cx, cy, theta1, delta_theta ];
}

//
// Approximate one unit arc segment with bézier curves,
// see http://math.stackexchange.com/questions/873224
//
function approximate_unit_arc(theta1, delta_theta) {
    const alpha = 4/3 * Math.tan(delta_theta/4);

    const x1 = Math.cos(theta1);
    const y1 = Math.sin(theta1);
    const x2 = Math.cos(theta1 + delta_theta);
    const y2 = Math.sin(theta1 + delta_theta);

    return [ x1, y1, x1 - y1*alpha, y1 + x1*alpha, x2 + y2*alpha, y2 - x2*alpha, x2, y2 ];
}

function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
    const sin_phi = Math.sin(phi * TAU / 360);
    const cos_phi = Math.cos(phi * TAU / 360);

    // Make sure radii are valid
    //
    const x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
    const y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

    if (x1p === 0 && y1p === 0) {
        // we're asked to draw line to itself
        return [];
    }

    if (rx === 0 || ry === 0) {
        // one of the radii is zero
        return [];
    }


    // Compensate out-of-range radii
    //
    rx = Math.abs(rx);
    ry = Math.abs(ry);

    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
        rx *= Math.sqrt(lambda);
        ry *= Math.sqrt(lambda);
    }


    // Get center parameters (cx, cy, theta1, delta_theta)
    //
    const cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);

    const result = [];
    let theta1 = cc[2];
    let delta_theta = cc[3];

    // Split an arc to multiple segments, so each segment
    // will be less than τ/4 (= 90°)
    //
    const segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
    delta_theta /= segments;

    for (let i = 0; i < segments; i++) {
        result.push(approximate_unit_arc(theta1, delta_theta));
        theta1 += delta_theta;
    }

    // We have a bezier approximation of a unit circle,
    // now need to transform back to the original ellipse
    //
    return result.map(function (curve) {
        for (let i = 0; i < curve.length; i += 2) {
            let x = curve[i    ];
            let y = curve[i + 1];

            // scale
            x *= rx;
            y *= ry;

            // rotate
            const xp = cos_phi*x - sin_phi*y;
            const yp = sin_phi*x + cos_phi*y;

            // translate
            curve[i    ] = xp + cc[0];
            curve[i + 1] = yp + cc[1];
        }

        return curve;
    });
}
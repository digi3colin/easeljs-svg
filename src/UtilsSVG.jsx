import arcToBezier from 'svg-arc-to-cubic-bezier';

export class UtilsSVG{

  static parse(pathString){
    return UtilsSVG.resolveRepeateCommand(
      pathString
        .match(/([astvzqmhlc])([^astvzqmhlc]*)/ig)
        .map(command => [command.slice(0,1), command.match(/-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig)])
        .map(command => [command[0]].concat((command[1] !== null) ? command[1].map(x => parseFloat(x)): []))
    );
  }

  static resolveRepeateCommand(commands){
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
  }

  static toString(commands){
    return commands
      .map(cmd => cmd.join(' '))
      .join(' ');
  }

  static pathBounds(absoluteCommands) {
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
  }

//abs-svg-path
  static abs(commands){
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
          case 'v':
            seg[1] += y;
            break;
          case 'h':
            seg[1] += x;
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
  }

  static drawGraphics(graphics, pathString, scale=1){
    let commands = UtilsSVG.abs(UtilsSVG.parse(pathString));
    if(scale !== 1){
      commands = commands.map(cmd => cmd.map((arg, i) => (i === 0) ? arg : arg * scale));
    }

    let bounds = UtilsSVG.pathBounds(commands);

    let x, y = 0;
    commands.forEach(cmd => {
      switch(cmd[0]){
        case 'A':

          console.log(`
rx ${cmd[1]} 
ry ${cmd[2]}
x-axis-rotation ${cmd[3] / scale}
large-arc-flag ${cmd[4] / scale}
sweep-flag ${cmd[5] / scale}
x ${cmd[6]}
y ${cmd[7]}
`);

          const b = arcToBezier({
            px: x,
            py: y,
            cx: cmd[6],
            cy: cmd[7],
            rx: cmd[1],
            ry: cmd[2],
            xAxisRotation: cmd[3] / scale,
            largeArcFlag: cmd[4] / scale,
            sweepFlag: cmd[5] / scale,
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

    return {graphics: graphics, bounds: bounds};
  }
}


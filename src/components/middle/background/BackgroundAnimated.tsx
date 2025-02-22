import fragmentShader from '!raw-loader!./fragment-shader.glsl';
import vertexShader from '!raw-loader!./vertex-shader.glsl';

let gradientCanvas: HTMLCanvasElement | undefined;

const renderBackground = new Event('renderBackground');

export default function renderBackgroundAnimated(animate: boolean = true) {
  initBackgroundAnimated();
  if (animate) document.dispatchEvent(renderBackground);
}
// document.addEventListener('click', () => {
//   renderBackgroundAnimated();
// });
document.addEventListener('messageAdded', () => {
  renderBackgroundAnimated();
});

function loadShaders(
  gl: WebGLRenderingContext,
  shaderSources: [vs: string, fs: string],
): readonly [WebGLShader, WebGLShader] {
  const [vs, fs] = shaderSources;
  return [
    loadShader(gl, vs, gl.VERTEX_SHADER),
    loadShader(gl, fs, gl.FRAGMENT_SHADER),
  ] as const;
}

function loadShader(
  gl: WebGLRenderingContext,
  shaderSource: string,
  shaderType: number,
): WebGLShader {
  const shader = gl.createShader(shaderType)!;
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  return shader;
}

function hexToVec4(
  hex: string,
): readonly [r: number, g: number, b: number, a: number] {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  const a = parseInt(hex.slice(0, 2), 16) / 255.0;
  const r = parseInt(hex.slice(2, 4), 16) / 255.0;
  const g = parseInt(hex.slice(4, 6), 16) / 255.0;
  const b = parseInt(hex.slice(6, 8), 16) / 255.0;

  return [r, g, b, a] as const;
}

function initBackgroundAnimated() {
  if (gradientCanvas) return;
  gradientCanvas = document.querySelector<HTMLCanvasElement>('#gradient-canvas')!;
  if (!gradientCanvas) return;

  const gl = gradientCanvas.getContext('webgl')!;
  if (!gl) {
    throw new Error('WebGL not supported');
  }

  const program = gl.createProgram()!;
  if (!program) {
    throw new Error('Unable to create WebGLProgram');
  }

  const shaders = loadShaders(gl, [vertexShader, fragmentShader]);
  for (const shader of shaders) {
    gl.attachShader(program, shader);
  }

  const speed = 0.1;
  let animating = false;

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program.');
  }

  gl.useProgram(program);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 1,
      -1, -1, 1,
      -1, 1, 1,
      -1, 1, 1,
    ]),
    gl.STATIC_DRAW);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const resolutionLoc = gl.getUniformLocation(program, 'resolution');
  const color1Loc = gl.getUniformLocation(program, 'color1');
  const color2Loc = gl.getUniformLocation(program, 'color2');
  const color3Loc = gl.getUniformLocation(program, 'color3');
  const color4Loc = gl.getUniformLocation(program, 'color4');
  const color1PosLoc = gl.getUniformLocation(program, 'color1Pos');
  const color2PosLoc = gl.getUniformLocation(program, 'color2Pos');
  const color3PosLoc = gl.getUniformLocation(program, 'color3Pos');
  const color4PosLoc = gl.getUniformLocation(program, 'color4Pos');

  const keyPoints = [
    [0, 0],
    [0.1, 0.5],
    [0.2, 0.8],
    [0.5, 0.95],
    [0.9, 0.9],
    [0.85, 0.5],
    [0.8, 0.2],
    [0.5, 0.1],
  ];
  let keyShift = 0;
  let targetColor1Pos: number[];
  let targetColor2Pos: number[];
  let targetColor3Pos: number[];
  let targetColor4Pos: number[];

  updateTargetColors();

  function updateTargetColors() {
    targetColor1Pos = keyPoints[keyShift % 8];
    targetColor2Pos = keyPoints[(keyShift + 2) % 8];
    targetColor3Pos = keyPoints[(keyShift + 4) % 8];
    targetColor4Pos = keyPoints[(keyShift + 6) % 8];
    keyShift = (keyShift + 1) % 8;
  }

  const color1Pos = [targetColor1Pos![0], targetColor1Pos![1]];
  const color2Pos = [targetColor2Pos![0], targetColor2Pos![1]];
  const color3Pos = [targetColor3Pos![0], targetColor3Pos![1]];
  const color4Pos = [targetColor4Pos![0], targetColor4Pos![1]];

  renderGradientCanvas();

  function renderGradientCanvas() {
    const gc = gradientCanvas;
    if (!gc) return;
    const cs = gc.dataset.colors!.split(',');
    const colors = cs.map((color) => { return hexToVec4(color); });
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
    gl.uniform2fv(resolutionLoc, [gl.canvas.width, gl.canvas.height]);
    gl.uniform4fv(color1Loc, colors[0]);
    gl.uniform4fv(color2Loc, colors[1]);
    gl.uniform4fv(color3Loc, colors[2]);
    gl.uniform4fv(color4Loc, colors[3]);
    gl.uniform2fv(color1PosLoc, color1Pos);
    gl.uniform2fv(color2PosLoc, color2Pos);
    gl.uniform2fv(color3PosLoc, color3Pos);
    gl.uniform2fv(color4PosLoc, color4Pos);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function distance(p1: number[], p2: number[]) {
    return Math.sqrt((p1[1] - p2[1]) * (p1[1] - p2[1]));
  }

  function animate() {
    animating = true;
    if (
      distance(color1Pos, targetColor1Pos) > 0.01
      || distance(color2Pos, targetColor2Pos) > 0.01
      || distance(color3Pos, targetColor3Pos) > 0.01
      || distance(color3Pos, targetColor3Pos) > 0.01
    ) {
      color1Pos[0] = color1Pos[0] * (1 - speed) + targetColor1Pos[0] * speed;
      color1Pos[1] = color1Pos[1] * (1 - speed) + targetColor1Pos[1] * speed;
      color2Pos[0] = color2Pos[0] * (1 - speed) + targetColor2Pos[0] * speed;
      color2Pos[1] = color2Pos[1] * (1 - speed) + targetColor2Pos[1] * speed;
      color3Pos[0] = color3Pos[0] * (1 - speed) + targetColor3Pos[0] * speed;
      color3Pos[1] = color3Pos[1] * (1 - speed) + targetColor3Pos[1] * speed;
      color4Pos[0] = color4Pos[0] * (1 - speed) + targetColor4Pos[0] * speed;
      color4Pos[1] = color4Pos[1] * (1 - speed) + targetColor4Pos[1] * speed;
      renderGradientCanvas();
      requestAnimationFrame(animate);
    } else {
      animating = false;
    }
  }

  document.addEventListener('renderBackground', () => {
    updateTargetColors();
    if (!animating) requestAnimationFrame(animate);
  });
}

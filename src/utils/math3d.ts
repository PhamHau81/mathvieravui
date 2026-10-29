/**
 * Computational Geometry Utilities for 3D Stereo-Geometry
 * Including: Cross-section cutting, 2D planar unrolling, circumscribed sphere,
 * 3D net unfolding, and intersection lines.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vScale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function vDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vCross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vLen(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function vNorm(a: Vec3): Vec3 {
  const l = vLen(a);
  if (l < 1e-7) return { x: 0, y: 1, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

export function vDist(a: Vec3, b: Vec3): number {
  return vLen(vSub(a, b));
}

export function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * Solves a 3x3 linear system Ax = B using Cramer's rule
 */
function solve3x3(A: number[][], B: number[]): number[] | null {
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < 1e-6) return null;

  const detX = (col: number) => {
    const M = A.map((row, r) => row.map((val, c) => (c === col ? B[r] : val)));
    return (
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    );
  };

  return [detX(0) / det, detX(1) / det, detX(2) / det];
}

/**
 * Finds the circumscribed sphere (Tâm và bán kính mặt cầu ngoại tiếp)
 * given 4 points of a tetrahedron.
 */
export function calculateCircumscribedSphere(
  p1: Vec3,
  p2: Vec3,
  p3: Vec3,
  p4: Vec3
): { center: Vec3; radius: number } | null {
  const points = [p1, p2, p3, p4];
  const A: number[][] = [];
  const B: number[] = [];

  const sq1 = p1.x * p1.x + p1.y * p1.y + p1.z * p1.z;

  for (let i = 1; i <= 3; i++) {
    const pi = points[i];
    const sqi = pi.x * pi.x + pi.y * pi.y + pi.z * pi.z;
    A.push([2 * (pi.x - p1.x), 2 * (pi.y - p1.y), 2 * (pi.z - p1.z)]);
    B.push(sqi - sq1);
  }

  const solution = solve3x3(A, B);
  if (!solution) return null;

  const center: Vec3 = { x: solution[0], y: solution[1], z: solution[2] };
  const radius = vDist(center, p1);

  return { center, radius };
}

/**
 * Line segment and plane intersection
 * Plane: P0 (point on plane), normal N
 * Line: P1 to P2
 */
export function intersectSegmentWithPlane(
  p1: Vec3,
  p2: Vec3,
  planePoint: Vec3,
  planeNormal: Vec3
): { hit: boolean; point?: Vec3; t?: number } {
  const dir = vSub(p2, p1);
  const denom = vDot(planeNormal, dir);

  if (Math.abs(denom) < 1e-6) {
    return { hit: false }; // Line is parallel to plane
  }

  const t = vDot(vSub(planePoint, p1), planeNormal) / denom;
  if (t >= -1e-4 && t <= 1 + 1e-4) {
    return {
      hit: true,
      point: vAdd(p1, vScale(dir, Math.max(0, Math.min(1, t)))),
      t,
    };
  }

  return { hit: false };
}

/**
 * Unrolls a 3D planar polygon onto a 2D coordinate system without distortion.
 * Computes exact edge lengths and polygon area.
 */
export function project3DPolygonTo2D(vertices: Vec3[]): {
  points2D: { x: number; y: number; label?: string }[];
  edgeLengths: number[];
  area: number;
  perimeter: number;
} {
  if (vertices.length < 3) {
    return { points2D: [], edgeLengths: [], area: 0, perimeter: 0 };
  }

  // Normal from first 3 non-collinear vertices
  let normal = vNorm(vCross(vSub(vertices[1], vertices[0]), vSub(vertices[2], vertices[0])));
  if (vLen(normal) < 0.5) {
    normal = { x: 0, y: 1, z: 0 };
  }

  // Choose u along first edge
  let u = vNorm(vSub(vertices[1], vertices[0]));
  let v = vNorm(vCross(normal, u));

  // Project vertices relative to vertices[0]
  const origin = vertices[0];
  const pts2D = vertices.map((p) => {
    const d = vSub(p, origin);
    return {
      x: vDot(d, u),
      y: vDot(d, v),
    };
  });

  // Calculate side lengths
  const edgeLengths: number[] = [];
  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    const len = vDist(vertices[i], next);
    edgeLengths.push(len);
    perimeter += len;
  }

  // Calculate 2D polygon area (Shoelace formula)
  let area = 0;
  for (let i = 0; i < pts2D.length; i++) {
    const j = (i + 1) % pts2D.length;
    area += pts2D[i].x * pts2D[j].y;
    area -= pts2D[j].x * pts2D[i].y;
  }
  area = Math.abs(area) / 2;

  return {
    points2D: pts2D,
    edgeLengths,
    area,
    perimeter,
  };
}

/**
 * Computes foot of altitude from apex to base polygon plane
 */
export function computeFootOfAltitude(apex: Vec3, basePoints: Vec3[]): Vec3 {
  if (basePoints.length === 0) return { x: apex.x, y: 0, z: apex.z };
  // Check if all base points lie on y = c plane
  const y0 = basePoints[0].y;
  const isHorizPlane = basePoints.every((p) => Math.abs(p.y - y0) < 1e-4);
  if (isHorizPlane) {
    return { x: apex.x, y: y0, z: apex.z };
  }
  // General plane projection:
  let n = vNorm(vCross(vSub(basePoints[1], basePoints[0]), vSub(basePoints[2], basePoints[0])));
  if (n.y < 0) {
    n = vScale(n, -1);
  }
  const dist = vDot(vSub(apex, basePoints[0]), n);
  return vSub(apex, vScale(n, dist));
}

/**
 * Computes centroid of a set of 3D points
 */
export function computeCentroid(points: Vec3[]): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce((acc, p) => vAdd(acc, p), { x: 0, y: 0, z: 0 });
  return vScale(sum, 1 / points.length);
}

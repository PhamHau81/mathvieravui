export type ActiveModule = '3d-geometry' | 'revolution' | '2d-geometry' | 'graphing' | 'analytics' | 'whiteboard' | 'prompts';

export type RevolutionPreset =
  | 'cone'           // Hình nón tròn xoay
  | 'cone-frustum'   // Hình nón cụt
  | 'cylinder'       // Hình trụ tròn xoay
  | 'sphere'         // Mặt cầu tròn xoay
  | 'torus'          // Mặt xuyến
  | 'paraboloid'     // Mặt Paraboloid
  | 'hyperboloid'    // Mặt Hyperboloid
  | 'vase'           // Bình hoa nghệ thuật
  | 'custom';        // Đường sinh tuỳ chỉnh

export interface ProfilePoint {
  r: number; // Bán kính từ trục quay (r >= 0)
  y: number; // Chiều cao dọc trục quay
  label?: string;
}

export interface Point3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  isFixed?: boolean;
  color?: string;
}

export interface Edge3D {
  from: string; // Point ID
  to: string;   // Point ID
  isDashed?: boolean;
  label?: string;
  color?: string;
}

export interface Face3D {
  vertexIds: string[];
  color?: string;
  opacity?: number;
}

export type Solid3DType = 
  | 'pyramid-tri'    // Hình chóp tam giác S.ABC
  | 'pyramid-quad'   // Hình chóp tứ giác S.ABCD
  | 'pyramid-pent'   // Hình chóp ngũ giác S.ABCDE
  | 'tetrahedron'    // Tứ diện đều
  | 'prism-tri'      // Hình lăng trụ tam giác
  | 'cuboid';        // Hình hộp chữ nhật

export interface SectionPlaneConfig {
  active: boolean;
  point1: string; // e.g. midpoint of SA
  ratio1: number; // 0 to 1
  point2: string; // e.g. midpoint of SB
  ratio2: number;
  point3: string; // e.g. midpoint of SC
  ratio3: number;
  color: string;
}

export interface Point2D {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface FunctionGraphConfig {
  presetType: 'cubic' | 'fractional' | 'quartic' | 'custom';
  expression: string;
  paramM: number;
  paramMin: number;
  paramMax: number;
  paramStep: number;
  isPlaying: boolean;
  showExtrema: boolean;
  showRoots: boolean;
  showAsymptotes: boolean;
  showTangent: boolean;
  tangentX0: number;
}

export interface VariationTableData {
  intervals: {
    xVal: string;
    yPrimeSign: '+' | '-' | '0' | '||';
    yVal: string;
    yArrow?: 'up' | 'down' | 'none';
  }[];
  criticalPoints: { x: number; y: number; type: 'Cực đại' | 'Cực tiểu' | 'Uốn' }[];
  asymptotes: { vertical?: number; horizontal?: number };
}

export interface WhiteboardStroke {
  id: string;
  type: 'pen' | 'highlighter' | 'line' | 'dashed-line' | 'arrow' | 'rect' | 'circle' | 'right-angle';
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
  isDashed?: boolean;
  label?: string;
  fromVertexId?: string;
  toVertexId?: string;
}

export interface WhiteboardVertex {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export interface WhiteboardText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  isFormula?: boolean;
}

export type BoardStyle = 'chalkboard' | 'whiteboard' | 'grid-caro' | 'isometric-dots';

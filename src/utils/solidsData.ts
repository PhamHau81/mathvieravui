import { Point3D, Edge3D, Face3D, Solid3DType } from '../types/math';

export interface SolidModelData {
  type: Solid3DType;
  title: string;
  name: string;
  description: string;
  vertices: Point3D[];
  edges: Edge3D[];
  faces: Face3D[];
  baseVertexIds: string[];
  topVertexIds?: string[];
  apexId?: string;
  defaultCuttingPoints?: { edgeIdx: number; ratio: number; label: string }[];
}

export function createSolidModel(type: Solid3DType): SolidModelData {
  switch (type) {
    case 'pyramid-tri': // Hình chóp tam giác S.ABC
      return {
        type,
        title: 'Hình chóp tam giác S.ABC',
        name: 'S.ABC',
        description: 'Đáy tam giác ABC, đỉnh S, chân đường cao H hạ từ S',
        vertices: [
          { id: 'S', label: 'S', x: 0, y: 3.2, z: 0, color: '#f59e0b' },
          { id: 'A', label: 'A', x: -2.0, y: 0, z: -1.0, color: '#3b82f6' },
          { id: 'B', label: 'B', x: 2.0, y: 0, z: -1.0, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 0.0, y: 0, z: 2.0, color: '#3b82f6' },
        ],
        edges: [
          { from: 'A', to: 'B', isDashed: true, label: 'c' }, // cạnh khuất phía sau
          { from: 'B', to: 'C', isDashed: false, label: 'a' },
          { from: 'C', to: 'A', isDashed: false, label: 'b' },
          { from: 'S', to: 'A', isDashed: false },
          { from: 'S', to: 'B', isDashed: false },
          { from: 'S', to: 'C', isDashed: false },
        ],
        faces: [
          { vertexIds: ['A', 'B', 'C'], color: '#3b82f6', opacity: 0.12 },
          { vertexIds: ['A', 'B', 'S'], color: '#10b981', opacity: 0.15 },
          { vertexIds: ['B', 'C', 'S'], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['C', 'A', 'S'], color: '#06b6d4', opacity: 0.18 },
        ],
        baseVertexIds: ['A', 'B', 'C'],
        apexId: 'S',
        defaultCuttingPoints: [
          { edgeIdx: 3, ratio: 0.5, label: 'M (SA)' },
          { edgeIdx: 4, ratio: 0.5, label: 'N (SB)' },
          { edgeIdx: 5, ratio: 0.5, label: 'P (SC)' },
        ],
      };

    case 'pyramid-quad': // Hình chóp tứ giác S.ABCD
      return {
        type,
        title: 'Hình chóp tứ giác S.ABCD',
        name: 'S.ABCD',
        description: 'Đáy tứ giác ABCD, đỉnh S, giao tuyến (SAC) & (SBD)',
        vertices: [
          { id: 'S', label: 'S', x: 0, y: 3.4, z: 0, color: '#f59e0b' },
          { id: 'A', label: 'A', x: -2.0, y: 0, z: -1.2, color: '#3b82f6' },
          { id: 'B', label: 'B', x: 1.6, y: 0, z: -1.2, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 2.0, y: 0, z: 1.2, color: '#3b82f6' },
          { id: 'D', label: 'D', x: -1.6, y: 0, z: 1.2, color: '#3b82f6' },
        ],
        edges: [
          { from: 'A', to: 'B', isDashed: true }, // Nét khuất đáy
          { from: 'A', to: 'D', isDashed: true }, // Nét khuất đáy
          { from: 'B', to: 'C', isDashed: false },
          { from: 'C', to: 'D', isDashed: false },
          { from: 'S', to: 'A', isDashed: true },  // Cạnh bên khuất SA
          { from: 'S', to: 'B', isDashed: false },
          { from: 'S', to: 'C', isDashed: false },
          { from: 'S', to: 'D', isDashed: false },
        ],
        faces: [
          { vertexIds: ['A', 'B', 'C', 'D'], color: '#3b82f6', opacity: 0.12 },
          { vertexIds: ['A', 'B', 'S'], color: '#10b981', opacity: 0.15 },
          { vertexIds: ['B', 'C', 'S'], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['C', 'D', 'S'], color: '#06b6d4', opacity: 0.18 },
          { vertexIds: ['D', 'A', 'S'], color: '#f43f5e', opacity: 0.15 },
        ],
        baseVertexIds: ['A', 'B', 'C', 'D'],
        apexId: 'S',
        defaultCuttingPoints: [
          { edgeIdx: 4, ratio: 0.5, label: 'M (SA)' },
          { edgeIdx: 5, ratio: 0.5, label: 'N (SB)' },
          { edgeIdx: 7, ratio: 0.5, label: 'P (SD)' },
        ],
      };

    case 'pyramid-pent': // Hình chóp ngũ giác S.ABCDE
      return {
        type,
        title: 'Hình chóp ngũ giác S.ABCDE',
        name: 'S.ABCDE',
        description: 'Đáy ngũ giác ABCDE, đỉnh S, cắt thiết diện 5 cạnh',
        vertices: [
          { id: 'S', label: 'S', x: 0, y: 3.5, z: 0, color: '#f59e0b' },
          { id: 'A', label: 'A', x: 0, y: 0, z: -2.2, color: '#3b82f6' },
          { id: 'B', label: 'B', x: 2.1, y: 0, z: -0.7, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 1.3, y: 0, z: 1.8, color: '#3b82f6' },
          { id: 'D', label: 'D', x: -1.3, y: 0, z: 1.8, color: '#3b82f6' },
          { id: 'E', label: 'E', x: -2.1, y: 0, z: -0.7, color: '#3b82f6' },
        ],
        edges: [
          { from: 'E', to: 'A', isDashed: true },
          { from: 'A', to: 'B', isDashed: true },
          { from: 'B', to: 'C', isDashed: false },
          { from: 'C', to: 'D', isDashed: false },
          { from: 'D', to: 'E', isDashed: false },
          { from: 'S', to: 'A', isDashed: true },
          { from: 'S', to: 'B', isDashed: false },
          { from: 'S', to: 'C', isDashed: false },
          { from: 'S', to: 'D', isDashed: false },
          { from: 'S', to: 'E', isDashed: false },
        ],
        faces: [
          { vertexIds: ['A', 'B', 'C', 'D', 'E'], color: '#3b82f6', opacity: 0.12 },
          { vertexIds: ['S', 'A', 'B'], color: '#10b981', opacity: 0.15 },
          { vertexIds: ['S', 'B', 'C'], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['S', 'C', 'D'], color: '#06b6d4', opacity: 0.18 },
          { vertexIds: ['S', 'D', 'E'], color: '#f43f5e', opacity: 0.18 },
          { vertexIds: ['S', 'E', 'A'], color: '#eab308', opacity: 0.15 },
        ],
        baseVertexIds: ['A', 'B', 'C', 'D', 'E'],
        apexId: 'S',
      };

    case 'tetrahedron': // Tứ diện đều
      return {
        type,
        title: 'Tứ diện đều ABCD (Regular Tetrahedron)',
        name: 'ABCD',
        description: 'Tứ diện có 4 mặt là tam giác đều, tâm mặt cầu ngoại tiếp I',
        vertices: [
          { id: 'A', label: 'A', x: 0, y: 2.8, z: 0, color: '#f59e0b' },
          { id: 'B', label: 'B', x: 0, y: 0, z: 2.2, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 1.9, y: 0, z: -1.1, color: '#3b82f6' },
          { id: 'D', label: 'D', x: -1.9, y: 0, z: -1.1, color: '#3b82f6' },
        ],
        edges: [
          { from: 'C', to: 'D', isDashed: true },
          { from: 'B', to: 'C', isDashed: false },
          { from: 'B', to: 'D', isDashed: false },
          { from: 'A', to: 'B', isDashed: false },
          { from: 'A', to: 'C', isDashed: false },
          { from: 'A', to: 'D', isDashed: false },
        ],
        faces: [
          { vertexIds: ['B', 'C', 'D'], color: '#3b82f6', opacity: 0.15 },
          { vertexIds: ['A', 'B', 'C'], color: '#10b981', opacity: 0.18 },
          { vertexIds: ['A', 'C', 'D'], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['A', 'D', 'B'], color: '#f43f5e', opacity: 0.18 },
        ],
        baseVertexIds: ['B', 'C', 'D'],
        apexId: 'A',
      };

    case 'prism-tri': // Hình lăng trụ tam giác ABC.A'B'C'
      return {
        type,
        title: "Hình lăng trụ tam giác ABC.A'B'C'",
        name: "ABC.A'B'C'",
        description: "Hai đáy song song (ABC) // (A'B'C'), các mặt bên là hình bình hành",
        vertices: [
          { id: 'A', label: 'A', x: -1.8, y: 0, z: -1.2, color: '#3b82f6' },
          { id: 'B', label: 'B', x: 1.8, y: 0, z: -1.2, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 0.2, y: 0, z: 1.8, color: '#3b82f6' },
          { id: "A'", label: "A'", x: -1.8, y: 3.0, z: -1.2, color: '#f59e0b' },
          { id: "B'", label: "B'", x: 1.8, y: 3.0, z: -1.2, color: '#f59e0b' },
          { id: "C'", label: "C'", x: 0.2, y: 3.0, z: 1.8, color: '#f59e0b' },
        ],
        edges: [
          { from: 'A', to: 'B', isDashed: true },
          { from: 'B', to: 'C', isDashed: false },
          { from: 'C', to: 'A', isDashed: false },
          { from: "A'", to: "B'", isDashed: false },
          { from: "B'", to: "C'", isDashed: false },
          { from: "C'", to: "A'", isDashed: false },
          { from: 'A', to: "A'", isDashed: true },
          { from: 'B', to: "B'", isDashed: false },
          { from: 'C', to: "C'", isDashed: false },
        ],
        faces: [
          { vertexIds: ['A', 'B', 'C'], color: '#3b82f6', opacity: 0.12 },
          { vertexIds: ["A'", "B'", "C'"], color: '#f59e0b', opacity: 0.12 },
          { vertexIds: ['A', 'B', "B'", "A'"], color: '#10b981', opacity: 0.15 },
          { vertexIds: ['B', 'C', "C'", "B'"], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['C', 'A', "A'", "C'"], color: '#06b6d4', opacity: 0.18 },
        ],
        baseVertexIds: ['A', 'B', 'C'],
        topVertexIds: ["A'", "B'", "C'"],
      };

    case 'cuboid': // Hình hộp chữ nhật ABCD.A'B'C'D'
      return {
        type,
        title: "Hình hộp chữ nhật ABCD.A'B'C'D'",
        name: "ABCD.A'B'C'D'",
        description: "6 mặt hình chữ nhật, 12 cạnh, các đường chéo cắt nhau tại tâm O",
        vertices: [
          { id: 'A', label: 'A', x: -1.8, y: 0, z: -1.5, color: '#3b82f6' },
          { id: 'B', label: 'B', x: 1.8, y: 0, z: -1.5, color: '#3b82f6' },
          { id: 'C', label: 'C', x: 1.8, y: 0, z: 1.5, color: '#3b82f6' },
          { id: 'D', label: 'D', x: -1.8, y: 0, z: 1.5, color: '#3b82f6' },
          { id: "A'", label: "A'", x: -1.8, y: 2.8, z: -1.5, color: '#f59e0b' },
          { id: "B'", label: "B'", x: 1.8, y: 2.8, z: -1.5, color: '#f59e0b' },
          { id: "C'", label: "C'", x: 1.8, y: 2.8, z: 1.5, color: '#f59e0b' },
          { id: "D'", label: "D'", x: -1.8, y: 2.8, z: 1.5, color: '#f59e0b' },
        ],
        edges: [
          { from: 'A', to: 'B', isDashed: true },
          { from: 'A', to: 'D', isDashed: true },
          { from: 'B', to: 'C', isDashed: false },
          { from: 'C', to: 'D', isDashed: false },
          { from: "A'", to: "B'", isDashed: false },
          { from: "B'", to: "C'", isDashed: false },
          { from: "C'", to: "D'", isDashed: false },
          { from: "D'", to: "A'", isDashed: false },
          { from: 'A', to: "A'", isDashed: true },
          { from: 'B', to: "B'", isDashed: false },
          { from: 'C', to: "C'", isDashed: false },
          { from: 'D', to: "D'", isDashed: false },
        ],
        faces: [
          { vertexIds: ['A', 'B', 'C', 'D'], color: '#3b82f6', opacity: 0.12 },
          { vertexIds: ["A'", "B'", "C'", "D'"], color: '#f59e0b', opacity: 0.12 },
          { vertexIds: ['A', 'B', "B'", "A'"], color: '#10b981', opacity: 0.15 },
          { vertexIds: ['B', 'C', "C'", "B'"], color: '#8b5cf6', opacity: 0.18 },
          { vertexIds: ['C', 'D', "D'", "C'"], color: '#06b6d4', opacity: 0.18 },
          { vertexIds: ['D', 'A', "A'", "D'"], color: '#f43f5e', opacity: 0.15 },
        ],
        baseVertexIds: ['A', 'B', 'C', 'D'],
        topVertexIds: ["A'", "B'", "C'", "D'"],
      };
  }
}

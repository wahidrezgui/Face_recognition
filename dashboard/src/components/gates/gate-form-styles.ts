export type SourceType = "webcam" | "rtsp";

export function inferSourceType(source: string): SourceType {
  if (source.startsWith("rtsp://") || source.startsWith("rtmp://")) return "rtsp";
  return "webcam";
}

export const inputCls =
  "w-full px-3 py-2 rounded text-xs bg-[#060f1e] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500";
export const labelCls = "block text-xs font-medium text-gray-400 mb-1";

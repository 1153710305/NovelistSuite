
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { OutlineNode } from '../types';
import { useI18n } from '../i18n';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface MindMapProps {
  data: OutlineNode | null; // 大纲数据结构（树形）
  onNodeClick: (node: OutlineNode) => void; // 节点点击回调
}

/**
 * MindMap 组件
 * 使用 D3.js 渲染可交互的树状图，支持缩放、平移和点击交互
 */
export const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null); // The group that gets transformed
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);
  const { t } = useI18n();

  // Track zoom state for UI feedback if needed, though D3 handles the transform
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    // 如果没有数据或 DOM 元素未挂载，则不执行渲染
    if (!data || !svgRef.current || !containerRef.current || !gRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // --- 1. Setup Zoom Behavior ---
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3]) // Min 0.1x, Max 3x
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomTransform(event.transform);
      });

    // Attach zoom to SVG
    svg.call(zoom)
       .on("dblclick.zoom", null); // Disable double click zoom

    // Store zoom instance for buttons
    (zoomRef as any).current = zoom;

    // --- 2. Data Processing & Layout ---
    
    // 清除之前的 SVG 内容 (Inside the Group)
    g.selectAll("*").remove();

    // 将数据转换为 D3 层级结构
    const root = d3.hierarchy<OutlineNode>(data);
    
    // 动态计算树的尺寸，基于节点数量防止重叠
    const nodeCount = root.descendants().length;
    const dynamicHeight = Math.max(height, nodeCount * 40);
    const dynamicWidth = Math.max(width, nodeCount * 20 + 500);

    // 创建树状布局
    const treeLayout = d3.tree<OutlineNode>()
      .size([dynamicHeight - 100, dynamicWidth - 200]);

    treeLayout(root);

    // --- 3. Rendering Links ---
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1") // 连线颜色
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal() // 使用水平贝塞尔曲线连接
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any
      );

    // --- 4. Rendering Nodes ---
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`) // 确定节点位置
      .style("cursor", "pointer")
      .on("click", (event, d) => {
         event.stopPropagation(); // Prevent zoom triggering on click
         onNodeClick(d.data); // 触发点击事件，传回数据给父组件
      });

    // 节点圆形图标
    node.append("circle")
      .attr("r", (d) => d.data.type === 'book' ? 8 : 6)
      .attr("fill", (d) => d.data.type === 'book' ? '#ef4444' : d.data.type === 'act' ? '#f59e0b' : '#3b82f6') // 根据类型着色
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

    // 节点文字标签
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => d.children ? -13 : 13) // 文字位置调整
      .style("text-anchor", (d) => d.children ? "end" : "start")
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("fill", "#334155")
      .style("font-weight", (d) => d.data.type === 'book' ? "bold" : "normal")
      .clone(true).lower() // 文字描边效果
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    // Center view initially if identity
    if (zoomTransform === d3.zoomIdentity) {
       const initialTransform = d3.zoomIdentity.translate(80, height / 2 - (root as any).x).scale(1);
       svg.call(zoom.transform, initialTransform);
    }

  }, [data, onNodeClick]); // Re-render when data changes

  const handleZoomIn = () => {
      if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.2);
      }
  };

  const handleZoomOut = () => {
      if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.8);
      }
  };

  const handleResetZoom = () => {
      if (svgRef.current && zoomRef.current) {
          // Simple reset to default position
           d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.translate(40, 300).scale(1));
      }
  };

  if (!data) return <div className="text-gray-400 text-center italic mt-10">{t('mindmap.empty')}</div>;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden border border-slate-200 rounded-lg bg-slate-50/50 shadow-inner relative group">
      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
          <g ref={gRef}></g>
      </svg>

      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-md border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
          <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title={t('architect.mapControls.zoomIn')}>
              <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title={t('architect.mapControls.zoomOut')}>
              <ZoomOut size={18} />
          </button>
          <button onClick={handleResetZoom} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title={t('architect.mapControls.fit')}>
              <Maximize size={18} />
          </button>
      </div>
      
      <div className="absolute top-4 right-4 text-[10px] text-slate-400 pointer-events-none select-none bg-white/50 px-2 py-1 rounded">
          Use mouse wheel to zoom, drag to pan
      </div>
    </div>
  );
};

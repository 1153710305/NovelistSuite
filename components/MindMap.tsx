
import React, { useEffect, useRef, useState } from 'react';
import * as d3Import from 'd3';
import { OutlineNode } from '../types';
import { useI18n } from '../i18n';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Cast d3 to any to avoid type mismatch issues with @types/d3 in the environment
const d3 = d3Import as any;

interface MindMapProps {
  data: OutlineNode | null; 
  onNodeClick: (node: OutlineNode) => void; 
}

export const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null); 
  const zoomRef = useRef<any>(null);
  const { t } = useI18n();
  const [zoomTransform, setZoomTransform] = useState<any>(d3.zoomIdentity);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current || !gRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 3]) 
      .on("zoom", (event: any) => {
        g.attr("transform", event.transform);
        setZoomTransform(event.transform);
      });

    svg.call(zoom).on("dblclick.zoom", null);
    zoomRef.current = zoom;

    g.selectAll("*").remove();

    const root = d3.hierarchy(data);
    const nodeCount = root.descendants().length;
    
    // Calculate depth to adjust width
    const maxDepth = root.height; // Height of tree (levels)

    // Dynamic sizing based on content - INCREASED for detailed view
    const dynamicHeight = Math.max(height, nodeCount * 60); // Increased vertical space
    const dynamicWidth = Math.max(width, (maxDepth + 1) * 400); // Increased horizontal space per level

    const treeLayout = d3.tree()
      .size([dynamicHeight - 100, dynamicWidth - 200]);

    treeLayout(root);

    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1") 
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal() 
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      );

    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d: any) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`) 
      .style("cursor", "pointer")
      .on("click", (event: any, d: any) => {
         event.stopPropagation(); 
         onNodeClick(d.data); 
      });

    node.append("circle")
      .attr("r", (d: any) => d.data.type === 'book' ? 9 : 7)
      .attr("fill", (d: any) => {
          switch(d.data.type) {
              case 'book': return '#ef4444'; // Red
              case 'act': return '#f59e0b'; // Amber
              case 'character': return '#a855f7'; // Purple
              case 'setting': return '#22c55e'; // Green
              default: return '#3b82f6'; // Blue (Chapter/Scene)
          }
      }) 
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => d.children ? -13 : 13) 
      .style("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.name)
      .style("font-size", "14px")
      .style("font-family", "sans-serif")
      .style("fill", "#334155")
      .style("font-weight", (d: any) => d.data.type === 'book' ? "bold" : "normal")
      .clone(true).lower() 
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    if (zoomTransform === d3.zoomIdentity) {
       // Adjust initial translate based on root height/position
       const initialTransform = d3.zoomIdentity.translate(80, height / 2 - (root as any).x).scale(0.8);
       svg.call(zoom.transform, initialTransform);
    }

  }, [data, onNodeClick]); 

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
           d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.translate(40, 300).scale(1));
      }
  };

  if (!data) return <div className="text-gray-400 text-center italic mt-10">{t('mindmap.empty')}</div>;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden border border-slate-200 rounded-lg bg-slate-50/50 shadow-inner relative group">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
          <g ref={gRef}></g>
      </svg>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-md border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
          <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><ZoomIn size={18} /></button>
          <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><ZoomOut size={18} /></button>
          <button onClick={handleResetZoom} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Maximize size={18} /></button>
      </div>
    </div>
  );
};

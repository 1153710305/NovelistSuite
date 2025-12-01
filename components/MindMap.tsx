
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
  
  // Track collapsed node IDs
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Recursively process data to handle collapsing (move children to _children)
  const processData = (node: OutlineNode): any => {
      if (!node) return null;
      // Create a shallow copy to avoid mutating the original prop persistently across renders in a bad way
      const newNode: any = { ...node };
      
      // If node is in collapsed set, hide children
      if (node.id && collapsedIds.has(node.id)) {
          newNode._children = node.children ? node.children.map(processData) : undefined;
          newNode.children = undefined;
      } else {
          newNode.children = node.children ? node.children.map(processData) : undefined;
          newNode._children = undefined; // Ensure _children is cleared if expanded
      }
      return newNode;
  };

  const toggleCollapse = (nodeId: string) => {
      setCollapsedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(nodeId)) {
              newSet.delete(nodeId);
          } else {
              newSet.add(nodeId);
          }
          return newSet;
      });
  };

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

    // Process data to apply collapse state
    const processedData = processData(data);
    const root = d3.hierarchy(processedData);
    
    // Calculate layout
    const nodeCount = root.descendants().length;
    const maxDepth = root.height; 

    const dynamicHeight = Math.max(height, nodeCount * 60); 
    const dynamicWidth = Math.max(width, (maxDepth + 1) * 400); 

    const treeLayout = d3.tree()
      .size([dynamicHeight - 100, dynamicWidth - 200]);

    treeLayout(root);

    // Links
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

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d: any) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`) 
      .style("cursor", "pointer")
      // FIX: Move click handlers to the GROUP element so clicking text/circle/bg works
      .on("click", (event: any, d: any) => {
         event.stopPropagation();
         onNodeClick(d.data); 
      })
      .on("dblclick", (event: any, d: any) => {
          event.stopPropagation();
          if (d.data.children || d.data._children) {
              toggleCollapse(d.data.id);
          }
      });

    // 1. Invisible Hit Area Circle (Larger for easier clicking)
    node.append("circle")
      .attr("r", 30) 
      .attr("fill", "transparent")
      .attr("stroke", "none");

    // 2. Visual Circle (The colored dot)
    node.append("circle")
      .attr("r", (d: any) => d.data.type === 'book' ? 9 : 7)
      .attr("fill", (d: any) => {
          if (d.data._children) return "#94a3b8"; // Gray for collapsed
          switch(d.data.type) {
              case 'book': return '#ef4444'; 
              case 'act': return '#f59e0b'; 
              case 'character': return '#a855f7'; 
              case 'setting': return '#22c55e'; 
              default: return '#3b82f6'; 
          }
      }) 
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))")
      .style("pointer-events", "none"); // Let events pass to the hit area/group

    // 3. Collapse/Expand Indicator (Small circle next to main circle)
    // Only show if the node has children (or hidden children)
    const indicator = node.filter((d: any) => d.children || d.data._children)
        .append("circle")
        .attr("cx", 14) // Offset to the right
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", (d: any) => d.data._children ? "#64748b" : "#fff") // Filled if collapsed, white if open
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", (event: any, d: any) => {
            event.stopPropagation();
            toggleCollapse(d.data.id);
        });

    // 4. Labels
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => d.children || d.data._children ? -18 : 18) 
      .style("text-anchor", (d: any) => d.children || d.data._children ? "end" : "start")
      .text((d: any) => d.data.name)
      .style("font-size", "14px")
      .style("font-family", "sans-serif")
      .style("fill", "#334155")
      .style("font-weight", (d: any) => d.data.type === 'book' ? "bold" : "normal")
      .clone(true).lower() 
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    // Initial Zoom
    if (zoomTransform === d3.zoomIdentity) {
       const initialTransform = d3.zoomIdentity.translate(80, height / 2 - (root as any).x).scale(0.8);
       svg.call(zoom.transform, initialTransform);
    }

  }, [data, onNodeClick, collapsedIds]); // Re-render when collapsedIds change

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
          <button onClick={handleZoomIn} className="p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors" title="Zoom In"><ZoomIn size={20} /></button>
          <button onClick={handleZoomOut} className="p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors" title="Zoom Out"><ZoomOut size={20} /></button>
          <button onClick={handleResetZoom} className="p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors" title="Fit to Screen"><Maximize size={20} /></button>
      </div>
      <div className="absolute top-4 left-4 text-xs text-slate-400 pointer-events-none">
          Double-click node to toggle collapse
      </div>
    </div>
  );
};

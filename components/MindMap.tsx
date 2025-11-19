import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { OutlineNode } from '../types';
import { useI18n } from '../i18n';

interface MindMapProps {
  data: OutlineNode | null;
  onNodeClick: (node: OutlineNode) => void;
}

export const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;
    
    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,0)");

    const root = d3.hierarchy<OutlineNode>(data);
    
    const treeLayout = d3.tree<OutlineNode>()
      .size([height - 40, width - 160]);

    treeLayout(root);

    // Links
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any
      );

    // Nodes
    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
         onNodeClick(d.data);
      });

    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d) => d.data.type === 'book' ? '#ef4444' : d.data.type === 'act' ? '#f59e0b' : '#3b82f6')
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => d.children ? -13 : 13)
      .style("text-anchor", (d) => d.children ? "end" : "start")
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("fill", "#334155")
      .clone(true).lower()
      .attr("stroke", "white")
      .attr("stroke-width", 3);

  }, [data, onNodeClick]);

  if (!data) return <div className="text-gray-400 text-center italic mt-10">{t('mindmap.empty')}</div>;

  return (
    <div ref={containerRef} className="w-full overflow-auto border border-slate-200 rounded-lg bg-white shadow-inner">
      <svg ref={svgRef}></svg>
    </div>
  );
};
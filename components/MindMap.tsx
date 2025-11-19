
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { OutlineNode } from '../types';
import { useI18n } from '../i18n';

interface MindMapProps {
  data: OutlineNode | null; // 大纲数据结构（树形）
  onNodeClick: (node: OutlineNode) => void; // 节点点击回调
}

/**
 * MindMap 组件
 * 使用 D3.js 渲染可交互的树状图，展示小说大纲结构（书 -> 卷 -> 章）
 */
export const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    // 如果没有数据或 DOM 元素未挂载，则不执行渲染
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;
    
    // 清除之前的 SVG 内容，防止重绘时叠加
    d3.select(svgRef.current).selectAll("*").remove();

    // 初始化 SVG 画布，设置偏移量
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,0)");

    // 将数据转换为 D3 层级结构
    const root = d3.hierarchy<OutlineNode>(data);
    
    // 创建树状布局
    const treeLayout = d3.tree<OutlineNode>()
      .size([height - 40, width - 160]);

    treeLayout(root);

    // 1. 绘制连接线 (Links)
    svg.selectAll(".link")
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

    // 2. 绘制节点 (Nodes)
    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`) // 确定节点位置
      .style("cursor", "pointer")
      .on("click", (event, d) => {
         onNodeClick(d.data); // 触发点击事件，传回数据给父组件
      });

    // 节点圆形图标
    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d) => d.data.type === 'book' ? '#ef4444' : d.data.type === 'act' ? '#f59e0b' : '#3b82f6') // 根据类型着色
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // 节点文字标签
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => d.children ? -13 : 13) // 文字位置调整
      .style("text-anchor", (d) => d.children ? "end" : "start")
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("fill", "#334155")
      .clone(true).lower() // 文字描边效果
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
import { hierarchy, tree } from 'd3-hierarchy';

export class TreeLayoutEngine {
  constructor() {
    this._layout = tree();
  }
  
  /**
   * Compute layout positions for tree nodes.
   * @param {Map<string, {id, parentId, depth, discoveryStep, expansionStep, metadata}>} treeNodes
   * @param {string} rootId - ID of the root node
   * @param {Object} options - { nodeWidth: 65, levelHeight: 80 }
   * @returns {{ nodes: Array<{id, x, y, depth, data}>, links: Array<{source, target}> }}
   */
  computeLayout(treeNodes, rootId, options = {}) {
    const { nodeWidth = 65, levelHeight = 80 } = options;
    
    if (!rootId || !treeNodes.has(rootId)) {
      return { nodes: [], links: [] };
    }
    
    // Build nested hierarchy data from flat Map
    const buildHierarchy = (nodeId) => {
      const node = treeNodes.get(nodeId);
      if (!node) return null;
      
      const children = [];
      for (const [key, n] of treeNodes.entries()) {
        if (n.parentId === nodeId && key !== nodeId) {
          const childNode = buildHierarchy(key);
          if (childNode) children.push(childNode);
        }
      }
      
      return { 
        ...node, 
        children: children.length > 0 ? children : undefined 
      };
    };
    
    const rootData = buildHierarchy(rootId);
    if (!rootData) return { nodes: [], links: [] };

    const root = hierarchy(rootData);
    
    // Set spacing
    this._layout.nodeSize([nodeWidth, levelHeight]);
    this._layout(root);
    
    const nodes = root.descendants().map(d => ({
      id: d.data.id,
      x: d.x,
      y: d.y,
      depth: d.depth,
      data: d.data,
    }));
    
    const links = root.links().map(l => ({
      source: { id: l.source.data.id, x: l.source.x, y: l.source.y },
      target: { id: l.target.data.id, x: l.target.x, y: l.target.y },
    }));
    
    return { nodes, links };
  }
  
  /**
   * Compute bounding box of the tree layout for centering and auto-fit
   */
  getBounds(nodes) {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    
    return { 
      minX, 
      maxX, 
      minY, 
      maxY, 
      width: maxX - minX, 
      height: maxY - minY 
    };
  }
}

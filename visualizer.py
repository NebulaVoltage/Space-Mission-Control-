import pygame
import math
import random
from collections import deque

# --- CONFIGURATION ---
CELL_SIZE = 24
ROWS = 25
COLS = 40
WIDTH = COLS * CELL_SIZE
HEIGHT = ROWS * CELL_SIZE
FPS = 60

# --- COLORS ---
BG_COLOR = (8, 8, 8)
GRID_COLOR = (20, 25, 40)
START_COLOR = (0, 255, 179)
GOAL_COLOR = (255, 77, 109)
PATH_COLOR = (255, 215, 0)
OBSTACLE_COLOR = (40, 45, 60)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("MCA Mission Control - BFS Cinematic Visualizer")
clock = pygame.time.Clock()

# --- HELPER FUNCTIONS ---
def interpolate_color(depth, max_depth):
    if max_depth <= 0: return (0, 229, 255)
    ratio = min(1.0, max(0.0, depth / max_depth))
    
    if ratio < 0.33:
        t = ratio / 0.33
        r = int(0 + (77 - 0) * t)
        g = int(229 + (124 - 229) * t)
        b = int(255 + (254 - 255) * t)
    elif ratio < 0.66:
        t = (ratio - 0.33) / 0.33
        r = int(77 + (139 - 77) * t)
        g = int(124 + (92 - 124) * t)
        b = int(254 + (246 - 254) * t)
    else:
        t = (ratio - 0.66) / 0.34
        r = int(139 + (236 - 139) * t)
        g = int(92 + (72 - 92) * t)
        b = int(246 + (153 - 246) * t)
    return (r, g, b)

# --- GRID GENERATION ---
grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
# Add some random obstacles
for r in range(ROWS):
    for c in range(COLS):
        if random.random() < 0.2:
            grid[r][c] = 1

start_node = (ROWS // 2, 2)
goal_node = (ROWS // 2, COLS - 3)
grid[start_node[0]][start_node[1]] = 0
grid[goal_node[0]][goal_node[1]] = 0

# --- STATE ---
visited = set()
visited.add(start_node)
queue = deque([(start_node, 0)]) # (node, depth)
parent_map = {start_node: None}
depth_map = {start_node: 0}
max_depth = 1

# VFX Data
particles = []
ripples = []
path_progress = 0
final_path = []
state = 'SEARCHING' # SEARCHING, PATH_ANIM, DONE

# --- BFS STEP GENERATOR ---
def bfs_step():
    global max_depth, state, final_path
    if not queue:
        state = 'DONE'
        return None
    
    current, depth = queue.popleft()
    if depth > max_depth: max_depth = depth
    
    # Spawn VFX for expansion
    cx, cy = current[1] * CELL_SIZE + CELL_SIZE // 2, current[0] * CELL_SIZE + CELL_SIZE // 2
    ripples.append({'x': cx, 'y': cy, 'radius': 0, 'max_radius': CELL_SIZE * 2, 'opacity': 255, 'speed': 1.5})
    for _ in range(5):
        angle = random.uniform(0, math.pi * 2)
        speed = random.uniform(1, 3)
        particles.append({
            'x': cx, 'y': cy,
            'vx': math.cos(angle) * speed, 'vy': math.sin(angle) * speed,
            'life': 255, 'decay': random.uniform(5, 15), 'size': random.uniform(2, 4)
        })

    if current == goal_node:
        state = 'PATH_ANIM'
        curr = goal_node
        while curr is not None:
            final_path.append(curr)
            curr = parent_map[curr]
        final_path.reverse()
        return current

    # Expand neighbors
    for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
        nr, nc = current[0] + dr, current[1] + dc
        if 0 <= nr < ROWS and 0 <= nc < COLS and grid[nr][nc] != 1:
            if (nr, nc) not in visited:
                visited.add((nr, nc))
                parent_map[(nr, nc)] = current
                depth_map[(nr, nc)] = depth + 1
                queue.append(((nr, nc), depth + 1))
    
    return current

# --- DRAWING ---
glow_surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)

frames_per_step = 2
frame_counter = 0

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Algorithm Logic
    if state == 'SEARCHING':
        frame_counter += 1
        if frame_counter >= frames_per_step:
            frame_counter = 0
            # Do multiple steps per frame to speed up visualizer
            for _ in range(2):
                if state == 'SEARCHING':
                    bfs_step()

    if state == 'PATH_ANIM' and path_progress < len(final_path):
        path_progress += 0.2

    # Draw Background
    screen.fill(BG_COLOR)
    glow_surface.fill((0, 0, 0, 0))

    # Grid
    for r in range(ROWS):
        for c in range(COLS):
            x, y = c * CELL_SIZE, r * CELL_SIZE
            if grid[r][c] == 1:
                pygame.draw.rect(screen, OBSTACLE_COLOR, (x+1, y+1, CELL_SIZE-2, CELL_SIZE-2))
                pygame.draw.line(screen, (50, 55, 70), (x+4, y+CELL_SIZE-4), (x+CELL_SIZE-4, y+4), 1)
            else:
                pygame.draw.rect(screen, GRID_COLOR, (x, y, CELL_SIZE, CELL_SIZE), 1)

    # Draw Visited Nodes (Older traces)
    for node in visited:
        if node == start_node or node == goal_node or any(n[0] == node for n in queue):
            continue
        
        depth = depth_map.get(node, 0)
        color = interpolate_color(depth, max_depth)
        x, y = node[1] * CELL_SIZE, node[0] * CELL_SIZE
        
        # Dim the older nodes
        dim_color = (int(color[0]*0.4), int(color[1]*0.4), int(color[2]*0.4))
        pygame.draw.rect(screen, dim_color, (x+2, y+2, CELL_SIZE-4, CELL_SIZE-4))

    # Draw Frontier (Neon Aura)
    now = pygame.time.get_ticks()
    pulse = (math.sin(now * 0.005) + 1) / 2 # 0 to 1
    
    for node, depth in queue:
        x, y = node[1] * CELL_SIZE, node[0] * CELL_SIZE
        cx, cy = x + CELL_SIZE//2, y + CELL_SIZE//2
        
        # Additive bloom on glow surface
        alpha = int(100 + pulse * 100)
        pygame.draw.circle(glow_surface, (0, 229, 255, alpha), (cx, cy), CELL_SIZE//2 + 4)
        
        # Core
        pygame.draw.rect(screen, (0, 229, 255), (x+2, y+2, CELL_SIZE-4, CELL_SIZE-4), max(1, int(2+pulse*2)))

    # Draw VFX (Particles & Ripples)
    # Ripples
    for r in ripples[:]:
        r['radius'] += r['speed']
        r['opacity'] = max(0, int(255 * (1 - r['radius'] / r['max_radius'])))
        if r['opacity'] <= 0:
            ripples.remove(r)
        else:
            pygame.draw.circle(glow_surface, (0, 229, 255, r['opacity']), (int(r['x']), int(r['y'])), int(r['radius']), 2)

    # Particles
    for p in particles[:]:
        p['x'] += p['vx']
        p['y'] += p['vy']
        p['life'] -= p['decay']
        if p['life'] <= 0:
            particles.remove(p)
        else:
            pygame.draw.circle(glow_surface, (0, 229, 255, int(p['life'])), (int(p['x']), int(p['y'])), int(p['size']))

    # Draw Path Beam
    if path_progress > 0 and len(final_path) > 1:
        points = []
        visible_nodes = min(len(final_path), math.ceil(path_progress))
        for i in range(visible_nodes):
            n = final_path[i]
            points.append((n[1] * CELL_SIZE + CELL_SIZE//2, n[0] * CELL_SIZE + CELL_SIZE//2))
        
        if len(points) > 1:
            # Draw bloom on glow surface
            pygame.draw.lines(glow_surface, (*PATH_COLOR, 150), False, points, 8)
            # Draw core on screen
            pygame.draw.lines(screen, PATH_COLOR, False, points, 3)

    # Draw Endpoints
    start_cx, start_cy = start_node[1] * CELL_SIZE + CELL_SIZE//2, start_node[0] * CELL_SIZE + CELL_SIZE//2
    goal_cx, goal_cy = goal_node[1] * CELL_SIZE + CELL_SIZE//2, goal_node[0] * CELL_SIZE + CELL_SIZE//2
    
    # Start
    pygame.draw.circle(glow_surface, (*START_COLOR, int(150 + pulse * 100)), (start_cx, start_cy), int(CELL_SIZE//2 + pulse*4))
    pygame.draw.circle(screen, START_COLOR, (start_cx, start_cy), CELL_SIZE//2 - 2, 2)
    pygame.draw.circle(screen, (255, 255, 255), (start_cx, start_cy), 3)

    # Goal
    pygame.draw.circle(glow_surface, (*GOAL_COLOR, int(150 + pulse * 100)), (goal_cx, goal_cy), int(CELL_SIZE//2 + pulse*4))
    pygame.draw.circle(screen, GOAL_COLOR, (goal_cx, goal_cy), CELL_SIZE//2 - 2, 2)
    pygame.draw.circle(screen, (255, 255, 255), (goal_cx, goal_cy), 3)

    # Blit Additive Surface
    screen.blit(glow_surface, (0, 0), special_flags=pygame.BLEND_ADD)

    pygame.display.flip()
    clock.tick(FPS)

pygame.quit()

import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]
    previous = {node: None for node in graph}

    while heap:
        current_dist, current_node = heapq.heappop(heap)
        if current_dist > distances[current_node]:
            continue
        for neighbor, weight in graph[current_node].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(heap, (distance, neighbor))

    return distances, previous


def get_shortest_path(graph, start, end):
    distances, previous = dijkstra(graph, start)
    path = []
    current = end
    while current is not None:
        path.insert(0, current)
        current = previous[current]
    return path, distances[end]


def build_graph(stations):
    """Build a simple fully connected graph from stations using distance as weight"""
    from math import radians, sin, cos, sqrt, atan2

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371  # Earth radius in km
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlng/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))

    graph = {s["id"]: {} for s in stations}
    for i, s1 in enumerate(stations):
        for j, s2 in enumerate(stations):
            if s1["id"] != s2["id"]:
                dist = haversine(s1["lat"], s1["lng"], s2["lat"], s2["lng"])
                graph[s1["id"]][s2["id"]] = round(dist, 3)
    return graph
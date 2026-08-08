export async function populateIncidentBlastRadius(client: any, incidentId: number, rootServiceId: number) {
  // BFS queue to traverse dependents
  const queue: number[] = [rootServiceId];
  
  // Track visited nodes to prevent cyclic infinite loops
  const visited = new Set<number>();
  visited.add(rootServiceId);

  while (queue.length > 0) {
    const currentServiceId = queue.shift()!;

    // Find services that depend on the current service
    const dependentsRes = await client.query(
      `SELECT service_id FROM dependencies WHERE depends_on_service_id = $1`,
      [currentServiceId]
    );

    for (const row of dependentsRes.rows) {
      const affectedServiceId = row.service_id;

      if (!visited.has(affectedServiceId)) {
        visited.add(affectedServiceId);
        queue.push(affectedServiceId);

        // Insert into incident_services as affected.
        // ON CONFLICT prevents duplicates if this node is somehow reached again or was already affected.
        await client.query(
          `INSERT INTO incident_services (incident_id, service_id, role, created_at)
           VALUES ($1, $2, 'affected', NOW())
           ON CONFLICT (incident_id, service_id) DO NOTHING`,
          [incidentId, affectedServiceId]
        );
        
        console.log(`[worker] Added service=${affectedServiceId} to blast radius of incident=${incidentId} (root=${rootServiceId})`);
      }
    }
  }
}

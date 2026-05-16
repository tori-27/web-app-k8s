export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'ready':
    case 'succeeded':
    case 'active':
      return '#22c55e';
    case 'pending':
    case 'containercreating':
    case 'init:0/1':
      return '#eab308';
    case 'failed':
    case 'error':
    case 'crashloopbackoff':
    case 'oomkilled':
    case 'evicted':
    case 'notready':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

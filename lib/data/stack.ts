export interface StackGroup {
  label: string;
  items: string[];
}

export const stackGroups: StackGroup[] = [
  { label: "languages",          items: ["TypeScript", "JavaScript", "Node.js", "Python"] },
  { label: "frontend",           items: ["React", "Next.js", "Redux Toolkit", "Mapbox GL", "React Leaflet", "Tailwind CSS", "Bootstrap"] },
  { label: "backend",            items: ["Express", "Hapi.js", "REST APIs", "GraphQL", "PayloadCMS", "Microservices"] },
  { label: "data + real-time",   items: ["MongoDB", "Sequelize", "PostgreSQL", "MySQL", "Redis", "RabbitMQ", "Socket.io", "Pusher", "Firebase"] },
  { label: "cloud + devops",     items: ["AWS", "EC2", "Docker", "Nginx", "SSL", "CI/CD"] },
  { label: "agentic ai",         items: ["Google ADKs", "MCP", "Claude Agents"] },
  { label: "also",               items: ["React Native + Expo", "Python (FastAPI)"] },
];

import { Code } from "../components/Code.tsx";
import { Footer } from "../components/Footer.tsx";
import { Hero } from "../components/Hero.tsx";

const data = [
  {
    endpoint: "/api/password",
    methods: "GET",
    description: "Generate a random password",
  },
  {
    endpoint: "/api/qr-code",
    methods: "GET",
    description: "Create a QR code for a given URL",
  },
  {
    endpoint: "/api/mit-license",
    methods: "GET",
    description: "Precompiled MIT License text",
  },
];

export default function Home() {
  return (
    <main class="index-main">
      <div class="index-container">
        <Hero isDark={false} />
        <hr class="index-divider" />
        <table class="index-table">
          <thead>
            <tr>
              <th class="index-table-header">Endpoint</th>
              <th class="index-table-header">Methods</th>
              <th class="index-table-header">Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr>
                <td class="index-table-cell">
                  <Code>
                    <a href={item.endpoint}>{item.endpoint}</a>
                  </Code>
                </td>
                <td class="index-table-cell">{item.methods}</td>
                <td class="index-table-cell">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr class="index-divider" />
        <Footer />
      </div>
    </main>
  );
}

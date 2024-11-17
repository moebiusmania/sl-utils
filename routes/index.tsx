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
    <main class="min-h-screen flex items-center justify-center p-4 dark:bg-black dark:text-white">
      <div class="max-w-2xl w-full mx-auto text-center">
        <Hero isDark={false} />
        <hr class="my-6 border-none" />
        <table class="w-full text-center border-collapse border-spacing-0 border-gray-200">
          <thead>
            <tr>
              <th class="border-b border-gray-200">Endpoint</th>
              <th class="border-b border-gray-200">Methods</th>
              <th class="border-b border-gray-200">Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr>
                <td class="py-1">
                  <Code>
                    <a href={item.endpoint}>{item.endpoint}</a>
                  </Code>
                </td>
                <td class="py-1">{item.methods}</td>
                <td class="py-1">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr class="my-6 border-none" />
        <Footer />
      </div>
    </main>
  );
}

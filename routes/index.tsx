import { Code } from "../components/Code.tsx";

const data = [
  {
    endpoint: "/api/password",
    methods: "GET",
    description: "Generate a random password",
  },
];

export default function Home() {
  return (
    <main class="min-h-screen flex items-center justify-center p-4">
      <div class="max-w-2xl w-full mx-auto text-center">
        {/* center the image and add a light border */}
        <figure class="overflow-hidden mb-4">
          <img
            src="sl.png"
            alt=""
            class="w-24 h-24 object-cover border border-gray-200 rounded-full mx-auto"
          />
        </figure>
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          sl-utils
        </h1>
        <p class="text-lg md:text-xl text-gray-600">
          A small collection of utilities for myself 🤓
        </p>
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
                <td>
                  <Code>
                    <a href={item.endpoint}>{item.endpoint}</a>
                  </Code>
                </td>
                <td>{item.methods}</td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

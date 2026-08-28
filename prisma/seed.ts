/**
 * Seeds a ready-to-explore demo account:
 *   email:    demo@studentlife.app
 *   password: demo1234
 *
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@studentlife.app";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists — nothing to do.");
    return;
  }

  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 12); // arrives in 12 days

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo Student",
      passwordHash,
      relocationProfile: {
        create: {
          origin: "Chicago",
          destination: "Phoenix",
          destinationLat: 33.4484,
          destinationLng: -112.074,
          arrivalDate: arrival,
          arrivalTime: "15:40",
          monthlyBudget: 2400,
          transportation: ["PUBLIC_TRANSIT", "RIDESHARE"],
          interests: ["FOOD", "OUTDOORS", "TECH"],
          homeAddress: "Downtown Phoenix, AZ",
          onboardingCompletedAt: new Date(),
        },
      },
      housingProfile: {
        create: {
          status: "SEARCHING",
          budget: 1250,
        },
      },
    },
  });

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        title: "Find housing",
        priority: "CRITICAL",
        phase: "BEFORE_ARRIVAL",
        category: "HOUSING",
        reason:
          "You arrive in Phoenix in 12 days without secured housing — this blocks everything else.",
      },
      {
        userId: user.id,
        title: "Arrange airport transportation",
        priority: "HIGH",
        phase: "BEFORE_ARRIVAL",
        category: "TRANSPORT",
        estimateMinutes: 10,
        reason: "Arrival is close — lock your ride from Sky Harbor now.",
      },
      {
        userId: user.id,
        title: "Prepare phone connectivity",
        priority: "HIGH",
        phase: "BEFORE_ARRIVAL",
        category: "CONNECTIVITY",
        estimateMinutes: 15,
        reason: "Maps, ride apps and contacts all depend on data on day one.",
      },
      {
        userId: user.id,
        title: "Estimate total move-in costs",
        priority: "HIGH",
        phase: "BEFORE_ARRIVAL",
        category: "MONEY",
        estimateMinutes: 20,
        reason: "Know the full cash needed before signing anything.",
      },
      {
        userId: user.id,
        title: "Create first grocery plan",
        priority: "MEDIUM",
        phase: "FIRST_7_DAYS",
        category: "FOOD",
        estimateMinutes: 15,
        reason: "A simple starter plan prevents expensive takeout.",
      },
    ],
  });

  console.log("Seeded demo account → demo@studentlife.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

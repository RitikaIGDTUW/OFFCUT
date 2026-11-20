import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { img } from "@/lib/seed-images";
import { SafeImage } from "@/components/ui/safe-image";

export const metadata: Metadata = { title: "About", description: "Why OFFCUT exists: high-grade industrial leftovers deserve a second life." };

export default function AboutPage() {
  return (
    <ProsePage eyebrow="About OFFCUT" title={<>Good material <em>shouldn&apos;t</em> be waste.</>} intro="OFFCUT is a materials exchange for the leftovers of Indian industry.">
      <p>
        Every week, factories across India throw away or warehouse material that most makers would love to work with: two-foot strips of
        Italian full-grain leather, aerospace-grade aluminium plate ends, roll-ends of waterproof membrane fabric, walnut and teak off-cuts,
        marble remnants. The quantities are simply too small for the factory&apos;s corporate buyers — so it becomes a disposal cost.
      </p>
      <div className="reg-marks relative my-10 aspect-[16/9] border border-ink">
        <SafeImage src={img("workshop", 1)} alt="Woodworking tools on a sunlit workbench" fill sizes="(min-width:768px) 768px, 100vw" className="object-cover" />
      </div>
      <h2>What we do</h2>
      <p>
        We buy these leftovers at a fair price (often saving the factory its disposal fees), bring them to our grading bay, and catalogue
        every lot by exact dimensions, weight, material grade and condition. Then we sell them — in small quantities — to the people who
        actually build things: makers, architecture students, custom tailors, furniture builders and hobbyists.
      </p>
      <h2>Why the spec-sheet obsession?</h2>
      <p>
        Buying leftovers online only works if you know exactly what you&apos;ll get. So every lot has a lot number, a grade stamp, and a
        spec sheet you can convert between millimetres and inches — plus a &ldquo;Will it fit?&rdquo; calculator that tells you how many
        pieces you can cut from it.
      </p>
      <h2>About this project</h2>
      <p>
        OFFCUT is a college project built to demonstrate a full-stack marketplace (Next.js, MongoDB, Auth.js, UploadThing and Razorpay in
        test mode). Stories and testimonials marked as sample content are illustrative.
      </p>
    </ProsePage>
  );
}

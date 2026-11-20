import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { User, type Role } from "@/models/User";

const f = createUploadthing();

/**
 * Every endpoint checks the signed-in user's role in `.middleware()` BEFORE UploadThing
 * accepts the file. What the middleware returns becomes `metadata` in onUploadComplete.
 */
async function requireRoles(roles: Role[]) {
  const session = await auth();
  if (!session?.user?.id) throw new UploadThingError("Please sign in to upload files.");
  await dbConnect();
  const user = await User.findById(session.user.id).select("role isBlocked").lean();
  if (!user || user.isBlocked || !roles.includes(user.role)) throw new UploadThingError("Not allowed.");
  return { userId: session.user.id, role: user.role };
}

const done = ({ metadata, file }: { metadata: { userId: string }; file: { ufsUrl: string; key: string; name: string } }) => ({
  uploadedBy: metadata.userId,
  url: file.ufsUrl,
  key: file.key,
  name: file.name,
});

export const ourFileRouter = {
  productImages: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(() => requireRoles(["admin"]))
    .onUploadComplete(done),

  categoryImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(() => requireRoles(["admin"]))
    .onUploadComplete(done),

  specSheet: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(() => requireRoles(["admin"]))
    .onUploadComplete(done),

  supplierPhotos: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(() => requireRoles(["supplier", "admin"]))
    .onUploadComplete(done),

  supplierDocs: f({ pdf: { maxFileSize: "8MB", maxFileCount: 5 }, image: { maxFileSize: "8MB", maxFileCount: 5 } })
    .middleware(() => requireRoles(["supplier", "admin"]))
    .onUploadComplete(done),

  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(() => requireRoles(["buyer", "supplier", "admin"]))
    .onUploadComplete(done),

  reviewPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 3 } })
    .middleware(async () => {
      const meta = await requireRoles(["buyer", "supplier", "admin"]);
      // Only buyers who have actually bought something may upload review photos.
      const hasPurchase = await Order.exists({
        userId: meta.userId,
        $or: [{ paymentStatus: "paid" }, { orderStatus: "delivered" }],
      });
      if (!hasPurchase) throw new UploadThingError("Review photos are for verified buyers.");
      return meta;
    })
    .onUploadComplete(done),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
export type UploadEndpoint = keyof OurFileRouter;

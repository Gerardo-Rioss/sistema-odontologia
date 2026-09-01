import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { attachmentService } from "@/services/attachment.service";

export const DELETE = withAuth(async (request, { session, params }) => {
  await attachmentService.delete(params.attachmentId, session.user.id);
  return new NextResponse(null, { status: 204 });
});

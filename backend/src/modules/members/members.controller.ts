import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../../utils/HttpError.js'
import * as svc from './members.service.js'
import type { ListMembersQuery, UpdateMemberBody } from './members.schema.js'

/**
 * GET /api/v1/members
 * Purpose: list every account — librarian Members page.
 * Input: ?q, ?role, ?status
 * Output: { data: MemberDTO[] }
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listMembers(req.query as unknown as ListMembersQuery)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/members/:id
 * Purpose: single-member detail for the librarian Edit modal.
 * Output: { data: MemberDTO }
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getMember(req.params.id!)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/v1/members/:id
 * Purpose: edit a member's display name or role.
 * Input: body { firstName?, lastName?, role? }
 * Output: { data: MemberDTO }
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const data = await svc.updateMember(
      req.params.id!,
      req.user.id,
      req.body as UpdateMemberBody,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/v1/members/:id
 * Purpose: remove a member with no loan history. Returns 409 if any loan
 * row references them — librarians should archive (manual role flip) those.
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    await svc.deleteMember(req.params.id!, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

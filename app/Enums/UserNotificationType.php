<?php

namespace App\Enums;

enum UserNotificationType: string
{
    case PostFavorited = 'post_favorited';
    case PostPendingModeration = 'post_pending_moderation';
    case PostApproved = 'post_approved';
    case PostRejected = 'post_rejected';
    case PostHiddenByReport = 'post_hidden_by_report';
    case PostDeleted = 'post_deleted';
    case PostRestored = 'post_restored';
    case CommentPublished = 'comment_published';
    case CommentDeleted = 'comment_deleted';
    case CommentRestored = 'comment_restored';
    case CommentOnYourPost = 'comment_on_your_post';
    case ReportSubmitted = 'report_submitted';
    case ReportReviewed = 'report_reviewed';
    case PostReportSubmitted = 'post_report_submitted';
    case PostReportReviewed = 'post_report_reviewed';
    case AccountBanned = 'account_banned';
    case AccountUnbanned = 'account_unbanned';
    case RoleChanged = 'role_changed';
}

import { Component, input, model, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Store } from '@ngrx/store';

import { from } from 'rxjs';
import { switchMap, tap, startWith, map } from 'rxjs/operators';

import { DataService } from '@/services/data.service';
import { Web3Service } from '@/services/web3.service';

import { Comment, DBComment, CommentWithReplies } from '@/models/comment';
import { GlobalState } from '@/models/global-state';

import { WalletAddressDirective } from '@/directives/wallet-address.directive';
import { TippyDirective } from '@/directives/tippy.directive';

import { AvatarComponent } from '@/components/avatar/avatar.component';

import { selectWalletAddress } from '@/state/selectors/app-state.selectors';
import { ZERO_ADDRESS } from '@/constants/utils';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WalletAddressDirective,
    TippyDirective,
    AvatarComponent,
  ],
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsComponent {

  hashId = input.required<string>();
  hashId$ = toObservable(this.hashId);

  commentValue = model<Record<string, string>>({});
  expanded = signal<Record<string, boolean>>({});
  replyActive = signal<string | null>(null);

  comments$ = this.hashId$.pipe(
    switchMap((hashId: string) => {
      return from(this.dataService.fetchComments(hashId)).pipe(
        switchMap((initialComments: CommentWithReplies[]) => {
          const topics = [hashId, ...this.getAllTopicsAndIds(initialComments)];
          return this.dataService.getCommentChanges(topics).pipe(
            switchMap(() => from(this.dataService.fetchComments(hashId))),
            startWith(initialComments)
          );
        })
      );
    })
  );

  connectedAddress$ = this.store.select(selectWalletAddress);

  constructor(
    private store: Store<GlobalState>,
    private web3Service: Web3Service,
    private dataService: DataService,
  ) {}

  getAllTopicsAndIds(comments: CommentWithReplies[]): string[] {
    const uniqueTopics = new Set<string>();

    const addCommentTopicsAndIds = (comment: CommentWithReplies) => {
      if (comment.topic) uniqueTopics.add(comment.topic);
      if (comment.id) uniqueTopics.add(comment.id);
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => addCommentTopicsAndIds(reply as CommentWithReplies));
      }
    };

    comments.forEach(comment => addCommentTopicsAndIds(comment));
    return Array.from(uniqueTopics);
  }

  /**
   * Updates the comment value for a specific topic when the user types in the comment box
   * @param event The new comment text value
   * @param topic The topic ID that the comment belongs to
   */
  handleCommentChanged(event: string, topic: string) {
    this.commentValue.update(prev => ({...prev, [topic]: event}));
  }

  /**
   * Creates and inscribes a new comment on the blockchain
   * @param content The text content of the comment
   * @param topic The topic ID that the comment belongs to
   */
  async addComment(content: string, topic: string) {
    if (!content) return;

    const commentObject: Comment = {
      topic,
      content,
      version: '0x0',
      encoding: 'utf8',
    };

    const commentString = JSON.stringify(commentObject);
    const commentUrl = `data:message/vnd.evmc+json,${commentString}`;
    console.log({commentUrl});

    const commentInscription = await this.web3Service.inscribe(commentUrl);
    console.log({commentInscription});
  }

  /**
   * Toggles the expanded state of a comment thread to show/hide replies
   * @param commentId The ID of the comment to expand/collapse
   */
  expandComment(commentId: string) {
    this.expanded.update(prev => ({...prev, [commentId]: !prev[commentId]}));
  }

  /**
   * Sets the active reply state to show the reply form for a specific comment
   * @param commentId The ID of the comment being replied to
   */
  setReplyActive(commentId: string) {
    const isActive = this.replyActive() === commentId;
    this.replyActive.set(isActive ? null : commentId);
  }

  clearCommentValue() {
    this.commentValue.set({});
  }

  clearActiveReply() {
    this.replyActive.set(null);
  }

  /**
   * Deletes a comment by transferring its NFT to the zero address
   * @param commentId The ID of the comment to delete
   */
  async deleteComment(commentId: string) {
    const hash = await this.web3Service.transferPhunk(commentId, ZERO_ADDRESS);
    if (!hash) return;

    const receipt = await this.web3Service.pollReceipt(hash);

    this.clearCommentValue();
    this.clearActiveReply();
  }
}

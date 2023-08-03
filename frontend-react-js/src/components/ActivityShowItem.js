import './ActivityItem.css';

import ActivityActionReply from '../components/ActivityActionReply';
import ActivityActionRepost from '../components/ActivityActionRepost';
import ActivityActionLike from '../components/ActivityActionLike';
import ActivityActionShare from '../components/ActivityActionShare';

import { Link } from "react-router-dom";
import { format_datetime, time_ago, time_future } from '../lib/DateTimeFormats';
import { ReactComponent as BombIcon } from './svg/bomb.svg';

export default function ActivityShowItem(props) {
  // Added a conditional check to ensure that props.activity is defined
  if (!props.activity) {
    return null; // or display a loading indicator or an error message
  }

  const avatarStyles = {
    backgroundImage: `url("https://assets.crudderme.click/avatars/${props.activity.cognito_user_id}.jpg")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="activity_item expanded">
      <div className="acitivty_main">
        <div className='activity_content_wrap'>
          <div className='activity_content'>
            {props.activity.handle && (
              <Link className='activity_avatar' to={`/@${props.activity.handle}`} style={avatarStyles}></Link>
            )}
            <div className='activity_meta'>
              {props.activity.display_name && props.activity.handle && (
                <div className='activity_identity'>
                  <Link className='display_name' to={`/@${props.activity.handle}`}>
                    {props.activity.display_name}
                  </Link>
                  <Link className="handle" to={`/@${props.activity.handle}`}>
                    @{props.activity.handle}
                  </Link>
                </div>
              )}
              <div className='activity_times'>
                <div className="created_at" title={format_datetime(props.activity.created_at)}>
                  <span className='ago'>{time_ago(props.activity.created_at)}</span>
                </div>
                <div className="expires_at" title={format_datetime(props.activity.expires_at)}>
                  <BombIcon className='icon' />
                  <span className='ago'>{time_future(props.activity.expires_at)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="message">{props.activity.message}</div>
        </div>

        <div className='expandedMeta'>
          <div className="created_at">
            {format_datetime(props.activity.created_at)}
          </div>
        </div>
        <div className="activity_actions">
          <ActivityActionReply
            setReplyActivity={props.setReplyActivity}
            activity={props.activity}
            setPopped={props.setPopped}
            activity_uuid={props.activity.uuid}
            count={props.activity.replies_count}
          />
          <ActivityActionRepost
            activity_uuid={props.activity.uuid}
            count={props.activity.reposts_count}
          />
          <ActivityActionLike
            activity_uuid={props.activity.uuid}
            count={props.activity.likes_count}
          />
          <ActivityActionShare activity_uuid={props.activity.uuid} />
        </div>
      </div>
    </div>
  );
}
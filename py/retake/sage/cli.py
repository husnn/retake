import os

from argparse import ArgumentParser

from . import config, utils


parser = ArgumentParser()

parser.add_argument("-id", required=True)
parser.add_argument("-vf", "--video-file")
parser.add_argument("-vt", "--video-title")
parser.add_argument("-a", "--action")

args = vars(parser.parse_args())

if args["id"]:
    video_dir = config.VIDEO_DIR + f"/{args['id']}"
    utils.ensure_dir_exists(video_dir)
    
    if args["video_file"]:
        _, file_extension = os.path.splitext(args["video_file"])
        file_path = video_dir + f"/video{file_extension}"

        if not os.path.exists(file_path):
            from shutil import copy
            copy(args["video_file"], file_path)

    match args["action"]:
        case "transcribe":
            from retake.sage.core import transcribe_video
            transcribe_video(args["id"], args["video_file"])
        case "highlight":
            from .core import get_highlights
            get_highlights(args["id"], args["video_title"])
        case "clip":
            from retake.sage.core import generate_clips
            generate_clips(args["id"])

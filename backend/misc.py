import os

import appdirs


def get_user_data_dir():
    appname = "AudiocraftUI"
    appauthor = "damian0815"

    user_data_dir = appdirs.user_data_dir(appname, appauthor)
    os.makedirs(user_data_dir, exist_ok=True)
    return user_data_dir


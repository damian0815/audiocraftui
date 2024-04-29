import os
import unittest
import torch
import soundfile as sf

from audiocraft_wrapper import AudiocraftWrapper


class MusicGenTokenizeTests(unittest.TestCase):

    def __init__(self, methodName):
        super().__init__(methodName)
        print("loading audiocraft MusicGen model...")
        self.audiocraft_wrapper = AudiocraftWrapper.from_musicgen_pretrained()
        print("loaded")

    def test_encode(self):
        TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), 'groove.wav')
        data, fs = sf.read(TESTDATA_FILENAME, always_2d=True)
        # data is ndarray(740352, 2)
        data_tensor = torch.transpose(torch.tensor(data, dtype=torch.float32), 1, 0)
        audio = self.audiocraft_wrapper.prepare_audio_for_tokenization(data_tensor, sample_rate=fs)
        print(audio)
        tokens = self.audiocraft_wrapper.generate_tokens_from_audio(audio)
        print(tokens)



    def test_decode_encode_cycle(self):

        tokens = torch.tensor([[[166, 166, 166, 166, 166, 1783, 2012, 2047, 1121, 490, 490,
                                 636, 1279, 753, 166, 166, 166, 166, 41, 490, 490, 1121,
                                 2047, 2047, 490],
                                [1931, 1931, 1931, 1931, 1817, 1843, 1628, 1628, 2019, 1130, 1130,
                                 1628, 1019, 1258, 1632, 994, 1447, 1605, 601, 1035, 1130, 1895,
                                 1628, 2019, 1130],
                                [2019, 2019, 2019, 177, 78, 1212, 1860, 821, 1860, 1860, 1572,
                                 183, 1674, 143, 151, 1895, 949, 143, 122, 1771, 1572, 687,
                                 821, 1860, 1860],
                                [1770, 1755, 1854, 1346, 1794, 497, 376, 772, 1884, 772, 1029,
                                 1883, 772, 162, 326, 433, 527, 1346, 1901, 772, 772, 772,
                                 772, 233, 233]]])

        audio = self.audiocraft_wrapper.generate_audio_from_tokens(tokens)
        TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), 'generate_audio_from_tokens_test.pt')
        with open(TESTDATA_FILENAME, 'rb') as f:
            expected_audio = torch.load(f)
        self.assertTrue(torch.equal(audio, expected_audio))

        # output is slightly different because of reasons?
        tokens_again = self.audiocraft_wrapper.generate_tokens_from_audio(audio)
        expected_tokens = torch.tensor([[[166, 166, 166, 166, 166, 1783, 2012, 2047, 1121, 490, 490,
                  636, 1279, 753, 166, 166, 166, 166, 41, 490, 490, 636,
                  2047, 2047, 490],
                 [1931, 1931, 1931, 490, 1817, 1843, 1100, 1628, 649, 1130, 1130,
                  1035, 1019, 1258, 1632, 994, 1301, 1605, 601, 1035, 1130, 709,
                  649, 649, 1130],
                 [2019, 2019, 924, 1919, 78, 1212, 1860, 821, 1860, 1860, 1572,
                  183, 1674, 143, 151, 1945, 105, 1677, 122, 1572, 1572, 36,
                  1860, 1860, 1568],
                 [1770, 1755, 1854, 1346, 844, 1033, 1278, 772, 1884, 772, 772,
                  478, 338, 162, 326, 92, 1862, 1346, 931, 772, 772, 772,
                  772, 233, 772]]])
        self.assertTrue(torch.equal(tokens_again, expected_tokens))


class MAGNeTTokenizeTests(unittest.TestCase):

    def __init__(self, methodName):
        super().__init__(methodName)
        print("loading audiocraft MAGNeT model...")
        self.audiocraft_wrapper = AudiocraftWrapper.from_magnet_pretrained()
        print("loaded")






if __name__ == '__main__':

    unittest.main()

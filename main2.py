from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import colorama
from colorama import Fore, Style
import jdatetime
# Initialize colorama
colorama.init()

# Chrome settings
options = Options()
options.add_argument("--disable-extensions")
driver1 = webdriver.Chrome(options=options)
driver2 = webdriver.Chrome(options=options)

# Open pages
url1 = "https://www.mexc.com/futures/DEBT_USDT"
url2 = "https://www.lbank.com/futures/debtusdt"
driver1.get(url1)
driver2.get(url2)
time.sleep(2)

try:
    old_text = ""

    while True:
        # Get data
        # data1 = float(driver1.find_element(By.XPATH, '//*[@id="subHeader"]/div[2]/div/div[2]/div/div/h2/span').text)
        # data2 = float(driver2.find_element(By.XPATH, '//*[@id="__next"]/section/section/div[3]/div/ul[1]/li[1]/span/div').text)
        data_last_sell_mexc = 0
        data_last_buy_mexc = 0


        data_last_sell_lbank = 0
        data_last_buy_lbank = 0

        try:
            for i in range(1,20):
                find_xpath = f'//*[@id="mexc-web-inspection-futures-exchange-orderbook"]/div[2]/div[2]/div[1]/div[1]/div[{i}]/div[1]/span'
                data_sell_mexc = driver1.find_element(By.XPATH , find_xpath)
                data_last_sell_mexc = float(data_sell_mexc.text)
        except Exception as e:
            pass

        try:
            find_xpath = f'//*[@id="mexc-web-inspection-futures-exchange-orderbook"]/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span'
            data_sell_mexc = driver1.find_element(By.XPATH, find_xpath)
            data_last_buy_mexc = float(data_sell_mexc.text)
        except Exception as e:
            pass



        try:
            for i in range(1,20):
                find_xpath = f'//*[@id="orderbook_container"]/div[2]/div[1]/ul/li[{i}]/div/span'
                data_sell_lbank = driver2.find_element(By.XPATH , find_xpath)
                data_last_sell_lbank = float(data_sell_lbank.text)
        except Exception as e:
            pass


        try:
            for i in range(1,20):
                find_xpath = f'//*[@id="orderbook_container"]/div[2]/div[3]/ul/li[1]/div/span'
                data_sell_lbank = driver2.find_element(By.XPATH , find_xpath)
                data_last_buy_lbank = float(data_sell_lbank.text)
        except Exception as e:
            pass

        data_last_buy_mexc = float(data_last_buy_mexc)
        data_last_sell_mexc = float(data_last_sell_mexc)
        data_last_buy_lbank = float(data_last_buy_lbank)
        data_last_sell_lbank = float(data_last_sell_lbank)

        mex_buy_and_lbnak_sell = abs(data_last_buy_mexc - data_last_sell_lbank)
        lbank_buy_and_mex_sell = abs(data_last_sell_mexc - data_last_buy_lbank)


        if mex_buy_and_lbnak_sell < lbank_buy_and_mex_sell:

            try:
                data1 = data_last_buy_mexc
                data2 = data_last_sell_lbank
                diff_absolute = abs(data1 - data2)
                diff_percent = diff_absolute / ((data1 + data2) / 2) * 100
                if diff_percent > 1.5:
                    new_text = (f"DEBT_USDT    =>  {Style.RESET_ALL}MEXC Future: {Fore.GREEN}{data1}{Style.RESET_ALL} |"
                            f" LBank Future: {Fore.RED}{data2}{Style.RESET_ALL} | "
                            f"Abs Diff: {Fore.CYAN}{diff_absolute:.5f}{Style.RESET_ALL} | "
                            f"% Diff: {Fore.CYAN}{diff_percent:.2f}%{Style.RESET_ALL} | ")
                    if old_text != new_text:
                        print(new_text + f"Time: {str(jdatetime.datetime.now())}")
                        old_text = new_text
            except Exception as e:
                print(e)
                pass

        else:
            pass

            try:
                data1 = data_last_sell_mexc
                data2 = data_last_buy_lbank
                diff_absolute = abs(data1 - data2)
                diff_percent = diff_absolute / ((data1 + data2) / 2) * 100
                if diff_percent > 1.5:
                    new_text = (f"DEBT_USDT    =>  {Style.RESET_ALL}MEXC Future: {Fore.RED}{data1}{Style.RESET_ALL} |"
                            f" LBank Future: {Fore.GREEN}{data2}{Style.RESET_ALL} | "
                            f"Abs Diff: {Fore.CYAN}{diff_absolute:.5f}{Style.RESET_ALL} | "
                            f"% Diff: {Fore.CYAN}{diff_percent:.2f}%{Style.RESET_ALL} | ")
                    if old_text != new_text:
                        print(new_text + f"Time: {str(jdatetime.datetime.now())}")
                        old_text = new_text
            except Exception as e:
                print(e)
                pass


finally:
    driver1.quit()
    driver2.quit()

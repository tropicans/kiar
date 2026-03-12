from PIL import Image

def remove_white_bg(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # change all white (also shades of whites)
        # to transparent
        if item[0] in list(range(200, 256)) and item[1] in list(range(200, 256)) and item[2] in list(range(200, 256)):
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(out_path, "PNG")

remove_white_bg(r"c:\Users\yudhiar\Downloads\oprek\Dev\kiar\public\logo.png", r"c:\Users\yudhiar\Downloads\oprek\Dev\kiar\public\logo.png")
print("done")

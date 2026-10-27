<?php

namespace App\Support;

/**
 * The pictures Meme It starts with: funny animal photos from Wikimedia
 * Commons, each public domain, CC0 or CC BY (never share-alike, since a
 * caption on top may count as an adaptation). Images: public/memes/, at
 * most 800 px. CC BY asks for credit, shown under the picture in the game.
 *
 * Each row: image, description (alt text), credit, source page.
 */
class MemeData
{
    public const MEMES = [
        ['memes/meme-hidden-cat-surprised-26346585262.jpg', 'A kitten peeking out from behind a lace curtain', 'Lihoman, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:%22Hidden_Cat_Surprised%22_(26346585262).jpg'],
        ['memes/meme-2010-365-2-a-face-only-a-llama-mother-could-love.jpg', 'A llama giving a sideways grin', 'cogdogblog, CC0', 'https://commons.wikimedia.org/wiki/File:2010-365-2_A_Face_Only_a_Llama_Mother_Could_Love_(4238580321).jpg'],
        ['memes/meme-alerted-cat-117884479-2015-cropped-2025.jpg', 'A ginger cat staring, startled', 'Ashkan Baharlooe, CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Alerted_Cat_(117884479)_(2015;_cropped_2025).jpeg'],
        ['memes/meme-baby-goat-face-in-margarita-island.jpg', 'A baby goat looking straight at the camera', 'Wilfredor, CC0', 'https://commons.wikimedia.org/wiki/File:Baby_Goat_face_in_Margarita_Island.jpg'],
        ['memes/meme-beagle-tongue-hanging-out.jpg', 'A beagle with its tongue hanging out', 'Malingering, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Beagle_tongue_hanging_out.jpg'],
        ['memes/meme-bradypus.jpg', 'A sloth hanging in a tree, smiling', 'Stefan Laube, public domain', 'https://commons.wikimedia.org/wiki/File:Bradypus.jpg'],
        ['memes/meme-brown-wood-owl-12340325875.jpg', 'Four owls sitting in a row', 'shankar s., CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Brown_Wood_Owl_(12340325875).jpg'],
        ['memes/meme-cat-sleeping-on-keyboard.jpg', 'A cat asleep on a computer keyboard', 'Panini!, CC0', 'https://commons.wikimedia.org/wiki/File:Cat_Sleeping_on_Keyboard.jpg'],
        ['memes/meme-cat-in-the-box-2.jpg', 'A cat squeezed into a box far too small', 'Matthew Paul Argall, CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Cat_in_the_Box_2.JPG'],
        ['memes/meme-cat-keyboard.jpg', 'A kitten typing on a keyboard', 'slava, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Cat_keyboard.jpg'],
        ['memes/meme-cat-yawning-dsc00577.jpg', 'A cat sprawled on its back, mouth open', 'Lemon tart, CC0', 'https://commons.wikimedia.org/wiki/File:Cat_yawning_-_DSC00577.jpg'],
        ['memes/meme-chillin-28725895306.jpg', 'A dog in sunglasses lounging in the sun', 'Sheila Sund, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Chillin%27_(28725895306).jpg'],
        ['memes/meme-crazy-eyes-eagle-owl-15737313443.jpg', 'An eagle owl with huge orange eyes', 'James Arup Photography, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Crazy_Eyes_-_Eagle_Owl_(15737313443).jpg'],
        ['memes/meme-do-i-have-hay-in-my-teeth-115758623.jpg', 'A camel chewing hay', 'Geoff Kass, CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Do_I_Have_Hay_In_My_Teeth_(115758623).jpeg'],
        ['memes/meme-dog-2049033-1280.jpg', 'A chihuahua in a cowboy hat, eyes half closed', 'Andris Dumins, CC0', 'https://commons.wikimedia.org/wiki/File:Dog-2049033_1280.jpg'],
        ['memes/meme-english-bulldog-dog-220489-1280.jpg', 'An English bulldog standing on grass', 'kaz (Pixabay), CC0', 'https://commons.wikimedia.org/wiki/File:English_Bulldog_-Dog-220489-1280.jpg'],
        ['memes/meme-fawn-and-white-welsh-corgi-puppy-standing-on-rea.jpg', 'A corgi puppy standing on its hind legs', 'Huoadg5888, CC0', 'https://commons.wikimedia.org/wiki/File:Fawn_and_white_Welsh_Corgi_puppy_standing_on_rear_legs_and_sticking_out_the_tongue_(cropped).jpg'],
        ['memes/meme-fox-kit-yawn-49170912286.jpg', 'A fox kit in the middle of a huge yawn', 'Kyla Marino, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Fox_Kit_Yawn_(49170912286).jpg'],
        ['memes/meme-frog-face.jpg', 'A plump frog staring straight ahead', 'LuiRossini, CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Frog_face.jpg'],
        ['memes/meme-funny-looking-dog.jpg', 'A labrador looking very pleased with itself', 'Pumpdurd, CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Funny_looking_dog.jpg'],
        ['memes/meme-funny-surreal.jpg', 'A fluffy dog upside down, tongue out', 'José Oliveira, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Funny_surreal.jpg'],
        ['memes/meme-gary-the-cat.jpg', 'A cat lying on a piano keyboard', 'Kankurette, CC0', 'https://commons.wikimedia.org/wiki/File:Gary_the_cat.jpg'],
        ['memes/meme-gray-seal-smiling-1.jpg', 'A seal peeking out of the water', 'Amaury Laporte, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Gray_Seal_Smiling_1.jpg'],
        ['memes/meme-horse-teeth.jpg', 'A horse showing its teeth through a fence', 'Fredrik Stark, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Horse_teeth.jpg'],
        ['memes/meme-kotetsu-the-ginger-cat-in-a-box-2012-08-05.jpg', 'A ginger cat peering through a hole in a box', 'yoppy, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Kotetsu_the_Ginger_cat_in_a_box_2012-08-05.jpg'],
        ['memes/meme-lazy-but-cute-dog-has-a-funny-idea-of-a-walk-201.jpg', 'A pomeranian in a jacket riding in a stroller', 'booledozer, public domain', 'https://commons.wikimedia.org/wiki/File:Lazy_but_cute_dog_has_a_funny_idea_of_a_%27walk%27,_2014_12_06_(1)_(15340134684).jpg'],
        ['memes/meme-llama-alpaca-animal-face.jpg', 'An alpaca face, very close up', 'Unknown author, public domain', 'https://commons.wikimedia.org/wiki/File:Llama_alpaca_animal_face.jpg'],
        ['memes/meme-lutra-lutra-1-otter-owl-and-wildlife-park.jpg', 'An otter in the grass, mouth open', 'Dave Pape, public domain', 'https://commons.wikimedia.org/wiki/File:Lutra_lutra_1_-_Otter,_Owl,_and_Wildlife_Park.jpg'],
        ['memes/meme-magellanic-penguin-valdes-peninsula-e.jpg', 'A penguin waddling', 'David, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Magellanic_penguin,_Valdes_Peninsula,_e.jpg'],
        ['memes/meme-marocco-camelteeth-232598027.jpg', 'A camel showing all its teeth', 'Ax Ra, CC0', 'https://commons.wikimedia.org/wiki/File:Marocco_Camelteeth_(232598027).jpeg'],
        ['memes/meme-military-working-dog-in-uh-60-black-hawk.jpg', 'A dog wearing goggles', 'Spc. Daniel Bear, public domain', 'https://commons.wikimedia.org/wiki/File:Military_working_dog_in_UH-60_Black_Hawk.jpg'],
        ['memes/meme-mini-olde-english-bulldog-2.jpg', 'A bulldog lying down, grinning', 'Koala91, CC0', 'https://commons.wikimedia.org/wiki/File:Mini_Olde_English_Bulldog_2.jpg'],
        ['memes/meme-monkey-face-530478280.jpg', 'A monkey looking up thoughtfully', 'Neil McIntosh, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Monkey_face_(530478280).jpg'],
        ['memes/meme-otis-gd-the-bulldog.jpg', 'A bulldog with droopy jowls', 'OtisGD, CC0', 'https://commons.wikimedia.org/wiki/File:Otis_GD_the_Bulldog.jpg'],
        ['memes/meme-prairie-dog-51-mud-bath.jpg', 'A prairie dog in a mud hole', 'Amaury Laporte, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Prairie_Dog_51_-_Mud_Bath.jpg'],
        ['memes/meme-procyon-lotor-common-raccoon.jpg', 'A raccoon walking on grass', 'Cary Bass-Deschênes, CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Procyon_lotor_(Common_raccoon).jpg'],
        ['memes/meme-psittacus-erithacus-nice-parrot.jpg', 'A grey parrot with a serious look', 'Dan Bennett, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Psittacus_erithacus_(Nice_parrot).jpg'],
        ['memes/meme-red-eyed-tree-frog-edit2.jpg', 'A red-eyed tree frog on a leaf', 'Careyjamesbalboa (Carey James Balboa), public domain', 'https://commons.wikimedia.org/wiki/File:Red_eyed_tree_frog_edit2.jpg'],
        ['memes/meme-sea-otter-morro-bay-13.jpg', 'A sea otter floating on its back', 'Mike Baird, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Sea-otter-morro-bay_13.jpg'],
        ['memes/meme-surprised-young-cat.jpg', 'A tabby cat with wide, shocked eyes', 'Tilman Piesk, CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Surprised_young_cat.JPG'],
        ['memes/meme-toggenburg-goat.jpg', 'A goat with a knowing look', 'Just chaos, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Toggenburg_goat.jpg'],
        ['memes/meme-two-french-bulldogs-swimming-in-life-jackets.jpg', 'Two French bulldogs swimming in life jackets', 'W.carter, CC0', 'https://commons.wikimedia.org/wiki/File:Two_French_bulldogs_swimming_in_life_jackets.jpg'],
        ['memes/meme-uscg-bomb-dog-ricky-wearing-doggles-for-a-helico.jpg', 'A dog in goggles and harness, tongue out', 'Brandyn Hill, public domain', 'https://commons.wikimedia.org/wiki/File:USCG_Bomb_dog_Ricky,_wearing_doggles,_for_a_helicopter_exercise_170816-G-RU729-882.jpg'],
        ['memes/meme-veterinary-services-34498666004.jpg', 'A calf staring at the camera', 'APHIS.gov, public domain', 'https://commons.wikimedia.org/wiki/File:Veterinary_Services_(34498666004).jpg'],
        ['memes/meme-what-s-he-doing-i-ve-no-idea-flickr-andy-morffew.jpg', 'Two burrowing owls side by side', 'Andy Morffew, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:What%27s_he_doing%5E_I%27ve_no_idea_-_Flickr_-_Andy_Morffew.jpg'],
        ['memes/meme-wikipedians-cat.jpg', 'A kitten asleep on a keyboard', 'Remedios44, public domain', 'https://commons.wikimedia.org/wiki/File:Wikipedians_cat.jpg'],
        ['memes/meme-yawning-cat-by-david-montolio.jpg', 'A cat in a full yawn, all teeth showing', 'David Montolio, CC0', 'https://commons.wikimedia.org/wiki/File:Yawning_cat_by_David_Montolio.jpg'],
        ['memes/meme-yawning-red-fox.jpg', 'A red fox yawning', 'Peter G Trimming, CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Yawning_red_fox.jpg'],
    ];
}
